// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./IEscrow.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/SendAPI.sol";
import {MinerAPI} from "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import {MinerTypes} from "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";
//import {BigIntCBOR} from "@zondax/filecoin-solidity/contracts/v0.8/cbor/BigIntCbor.sol";


contract Escrow is IEscrow {
    address public lender;
    address public borrower;
    bytes public minerActor;
    uint256 public loanAmount;
    uint256 public rateAmount;
    uint256 public end;
    bool public started;
    bool public canTerminate;
    uint256 public lastWithdraw;
    uint256 public withdrawInterval;

    modifier onlyLender {
        require(msg.sender == lender);
        _;
    }

    modifier onlyBorrower {
        require(msg.sender == borrower);
        _;
    }

    constructor(
        address _lender,
        address _borrower,
        bytes memory _minerActor,
        uint256 _loanAmount,
        uint256 _rateAmount,
        uint256 _end
    ) {
        lender = _lender;
        borrower = _borrower;
        minerActor = _minerActor;
       loanAmount = _loanAmount;
        rateAmount = _rateAmount;
        end = _end;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function startLoan() external {
        require(!started);
        // set this contract as the new Owner of the Miner Actor
        MinerAPI.changeOwnerAddress(minerActor, abi.encodePacked(address(this)));
        // TODO set beneficiary

        MinerTypes.ChangeBeneficiaryParams memory params;
        params.new_beneficiary = abi.encodePacked(address(this));
        //params.new_quota = 90;


        //BigIntCbor.BigInt memory param; 
        //param.val = //;
       // param.neg = true;


        params.new_expiration = uint64(end - block.timestamp);
        MinerAPI.changeBeneficiary(minerActor, params);
        // check owner change


        // TODO check new owner is Escrow
        require(MinerAPI.isControllingAddress(minerActor, abi.encodePacked(address(this))).is_controlling);
        // abi.decode

        // TODO check new beneficiary is Escrow

        started = true;
    }
 
    function transferToMinerActor(uint256 amount) external {
        require(
            msg.sender == borrower /* || msg.sender == lender */
        );
        require(amount <= address(this).balance);
        SendAPI.send(minerActor, amount);
    }

    // valutare se chiamarla noi o il lender
    function transferFromMinerActor(MinerTypes.WithdrawBalanceParams memory params)
        external
        returns (MinerTypes.WithdrawBalanceReturn memory)
    {
        require(msg.sender == borrower || msg.sender == lender);
        return MinerAPI.withdrawBalance(minerActor, params);
    }

    function nextWithdraw() public view returns (uint256) {
        return lastWithdraw == 0 ? 0 : (lastWithdraw + withdrawInterval);
    }

    function repay() onlyBorrower external {
        require(block.timestamp >= nextWithdraw(), "Too early");
        lastWithdraw = block.timestamp;
        if (address(this).balance >= rateAmount) {
            // transfer $fil to lender
            submit(lender, rateAmount, "");
            emit PaidRate(block.timestamp, rateAmount);
        } else {
            canTerminate = true;
            emit FailedPaidRate(block.timestamp);
        }
    }

    function withdrawBeforLoanStarts() onlyLender external {
        require(!started);
        emit ClosedLoan(block.timestamp, address(this).balance);
        // selfdescruct and send $FIL back to the lender
        address payable lenderAddress = payable(address(lender));
   		selfdestruct(lenderAddress);
    }

    function closeLoan() external {
        require(canTerminate);

        //TODO add all the logic to get back the collateral from Miner Actor


        // prendi il balance del miner actor 
       // transferFromMinerActor(params);

        // change the owner wallet setting the borrower as the new owner
        MinerAPI.changeOwnerAddress(minerActor, abi.encodePacked(borrower));
        emit ClosedLoan(block.timestamp, address(this).balance);
        // selfdescruct and send $FIL back to the lender
        address payable lenderAddress = payable(address(lender));
   		selfdestruct(lenderAddress);
    }

    function manageCollateral(uint256 amount) external {
        //TODO
    }

    function submit(address subject, uint256 value, bytes memory inputData) internal returns(bytes memory returnData) {
        bool result;
        (result, returnData) = subject.call{value : value}(inputData);
        if (!result) {
            assembly {
                revert(add(returnData, 0x20), mload(returnData))
            }
        }
    }
}
