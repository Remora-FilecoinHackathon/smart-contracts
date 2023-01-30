// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./IEscrow.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/SendAPI.sol";
import {MinerAPI} from "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import {MinerTypes} from "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";
import {BigIntCBOR} from "@zondax/filecoin-solidity/contracts/v0.8/cbor/BigIntCbor.sol";

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
    uint256 public loanPaidAmount;
    MinerTypes.WithdrawBalanceParams closeLoanParam;

    constructor(
        address _lender,
        address _borrower,
        bytes memory _minerActor,
        uint256 _loanAmount,
        uint256 _rateAmount,
        uint256 _withdrawInterval,
        uint256 _end
    ) {
        lender = _lender;
        borrower = _borrower;
        minerActor = _minerActor;
        loanAmount = _loanAmount;
        rateAmount = _rateAmount;
        withdrawInterval = _withdrawInterval;
        end = _end;
        closeLoanParam.amount_requested = abi.encodePacked(
            address(this).balance
        );
    }

    function startLoan() external {
        require(!started);
        // set this contract as the new Owner of the Miner Actor
        MinerAPI.changeOwnerAddress(
            minerActor,
            abi.encodePacked(address(this))
        );

        MinerTypes.ChangeBeneficiaryParams memory params;
        params.new_beneficiary = abi.encodePacked(address(this));
        params.new_quota.val = abi.encodePacked(address(this).balance);
        params.new_expiration = uint64(end - block.timestamp);
        MinerAPI.changeBeneficiary(minerActor, params);

        // check on Owner
        MinerTypes.GetOwnerReturn memory getOwnerReturnValue = MinerAPI
            .getOwner(minerActor);
        address checkOwner = abi.decode(getOwnerReturnValue.owner, (address));
        require(checkOwner == address(this));
        // check on Beneficiary
        MinerTypes.GetBeneficiaryReturn
            memory getBeneficiaryReturnValue = MinerAPI.getBeneficiary(
                minerActor
            );
        address checkBeneficiary = abi.decode(
            getBeneficiaryReturnValue.active.beneficiary,
            (address)
        );
        require(checkBeneficiary == address(this));

        started = true;
    }

    function transferToMinerActor(uint256 amount) external {
        require(msg.sender == borrower);
        require(amount <= address(this).balance);
        SendAPI.send(minerActor, amount);
    }

    function transferFromMinerActor(
        MinerTypes.WithdrawBalanceParams memory balanceParams
    ) external returns (MinerTypes.WithdrawBalanceReturn memory) {
        require(msg.sender == borrower || msg.sender == lender);
        return MinerAPI.withdrawBalance(minerActor, balanceParams);
    }

    function nextWithdraw() public view returns (uint256) {
        return lastWithdraw == 0 ? 0 : (lastWithdraw + withdrawInterval);
    }

    function repay() external {
        require(block.timestamp >= nextWithdraw(), "Too early");
        require((loanAmount >= loanPaidAmount), "loan repaid");
        if (address(this).balance >= rateAmount) {
            // transfer $fil to lender
            submit(lender, rateAmount, "");
            loanPaidAmount += rateAmount;
            emit PaidRate(block.timestamp, rateAmount, loanPaidAmount);
        } else {
            canTerminate = true;
            emit FailedPaidRate(block.timestamp);
        }
        lastWithdraw = block.timestamp;
    }

    function withdrawBeforLoanStarts() external {
        require(msg.sender == lender);
        require(!started);
        emit ClosedLoan(block.timestamp, address(this).balance, 0);
        // selfdescruct and send $FIL back to the lender
        address payable lenderAddress = payable(address(lender));
        selfdestruct(lenderAddress);
    }

    function closeLoan() external {
        require(canTerminate || block.timestamp >= end);
        MinerAPI.withdrawBalance(minerActor, closeLoanParam);
        // change the owner wallet setting the borrower as the new owner
        MinerAPI.changeOwnerAddress(minerActor, abi.encodePacked(borrower));
        // change the beneficiary wallet setting the borrower as the new owner
        MinerTypes.ChangeBeneficiaryParams memory params;
        params.new_beneficiary = abi.encodePacked(borrower);
        // 1 $FIL in Wei
        uint256 quota = 1000000000000000000;
        params.new_quota.val = abi.encodePacked(quota);
        params.new_expiration = uint64(block.timestamp + end);
        MinerAPI.changeBeneficiary(minerActor, params);

        emit ClosedLoan(block.timestamp, address(this).balance, loanPaidAmount);
        // selfdescruct and send $FIL back to the lender
        address payable lenderAddress = payable(address(lender));
        selfdestruct(lenderAddress);
    }

    function submit(
        address subject,
        uint256 value,
        bytes memory inputData
    ) internal returns (bytes memory returnData) {
        bool result;
        (result, returnData) = subject.call{value: value}(inputData);
        if (!result) {
            assembly {
                revert(add(returnData, 0x20), mload(returnData))
            }
        }
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
