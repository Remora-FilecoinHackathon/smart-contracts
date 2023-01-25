// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./IEscrow.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/SendAPI.sol";
import {MinerAPI} from "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import {MinerTypes} from "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";

contract Escrow is IEscrow{
    
    address public lender;
    address public borrower;
    bytes public minerActor;
    uint256 public rateAmount;
    uint256 public end;
    bool public started;
    bool public canTerminate;
    uint256 public lastWithdraw;
    uint256 public withdrawInterval;

    constructor(address _lender, address _borrower, bytes memory _minerActor, uint256 _rateAmount, uint256 _end) {
        lender = _lender;
        borrower = _borrower;
        minerActor = _minerActor;
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
        // check owner change
        // check new owner is Escrow
        started = true;
    }

    function transferToMinerActor(uint256 amount) external {
        require(msg.sender == borrower || msg.sender == lender);
        require(amount <= address(this).balance);
        SendAPI.send(minerActor, amount);
    }

    function transferFromMinerActor(MinerTypes.WithdrawBalanceParams memory params) external returns (MinerTypes.WithdrawBalanceReturn memory){
        require(msg.sender == borrower || msg.sender == lender);
        return MinerAPI.withdrawBalance(minerActor, params);
    }

    function nextWithdraw() public view returns(uint256) {
        return lastWithdraw == 0 ? 0 : (lastWithdraw + withdrawInterval);
    }

   function repay() external {
    require(block.timestamp >= nextWithdraw(), "Too early");
    lastWithdraw = block.timestamp;
    if (address(this).balance >= rateAmount) {
        //transfer $fil to lender
        emit PaidRate(block.timestamp, rateAmount);
    }
    else {
        canTerminate = true;
        emit FailedPaidRate(block.timestamp);
    }
   }

   function withdrawBeforLoanStarts () external {
    require (msg.sender == lender);
    require(!started);
    //transfer $fil to lender
    emit ClosedLoan(block.timestamp, address(this).balance);
   }

   function closeLoan () external {
    require (canTerminate);

    //TODO add all the logic to get back the collateral from Miner Actor

    // change the owner wallet setting the borrower as the new owner
    MinerAPI.changeOwnerAddress(minerActor, abi.encodePacked(borrower));
    emit ClosedLoan(block.timestamp, address(this).balance);
   }

   function manageCollateral (uint256 amount) external {
    //TODO
   }
}
