// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

/*
 * First draft of the LendingManager contract. See TODO and optimize code
 */

// import "hardhat/console.sol";
import "./Escrow.sol";
import {MinerAPI} from "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import {MinerTypes} from "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";
import {Actor} from "@zondax/filecoin-solidity/contracts/v0.8/utils/Actor.sol";
import {Misc} from "@zondax/filecoin-solidity/contracts/v0.8/utils/Misc.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract LenderManager {
    event LenderPosition(
        address lender,
        uint256 amount,
        uint256 endTimestamp,
        uint256 interestRate
    );

    event BorrowOrder(
        address escrow,
        uint256 loanAmount,
        uint256 lenderAmountAvailable,
        uint256 startBlock,
        uint256 amountToPay,
        address escrowContract,
        uint256 orderID
    );

    struct BorrowerOrders {
        uint256 id;
        address borrower;
        uint256 loanAmount;
        uint256 startBlock; // when the loan starts
        uint256 amountToPayEveryBlock;
        address escrow;
    }

    struct LendingPosition {
        uint256 id;
        address lender;
        uint256 availableAmount;
        uint256 endTimestamp;
        uint256 interestRate;
    }
    using Counters for Counters.Counter;
    Counters.Counter private _ordersForLendingCounter;

    LendingPosition[] public lendingPositions;
    mapping(uint256 => BorrowerOrders[]) ordersForLending;

    constructor() {}

    function createLendingPosition(uint256 duration, uint256 loanInterestRate) public payable {
        require(msg.value > 0, "send some FIL to create a lending position");
        require(duration > block.timestamp, "duration must be greater than current timestamp");
        lendingPositions.push(
            LendingPosition(
                _ordersForLendingCounter.current(),
                msg.sender,
                msg.value,
                block.timestamp + duration,
                loanInterestRate
            )
        );
        _ordersForLendingCounter.increment();
        emit LenderPosition(msg.sender, msg.value, block.timestamp + duration, loanInterestRate);
    }

    function createBorrow(uint256 amount, uint64 minerActorID) public {
        require(checkIsOwner(msg.sender, minerActorID));
        require(checkReputation(msg.sender));
        require(amount <= address(this).balance);

        Escrow escrow = (new Escrow)();
        // set escrow as owner of the miner actor
        MinerAPI.changeOwnerAddress(
            abi.encodePacked(minerActorID),
            abi.encodePacked(address(escrow))
        );
        // TODO check if another request to effectively change the owner is needed

        //send FIL to miner actor
        Actor.callByID(minerActorID, 0, Misc.NONE_CODEC, new bytes(0), amount);
        // TODO update the Lending Manager position and amount of available FIL to borrow
    }

    function clone() private {}

    function checkIsOwner(address borrower, uint64 minerActorID) public returns (bool) {
        // TODO convert msg.sender to Filecoin address form or viceversa in order to compare them
        // MinerTypes.GetOwnerReturn memory getOwnerReturnValue = MinerAPI.getOwner(minerActorID);
        // return msg.sender == getOwnerReturnValue.owner
        return true;
    }

    function checkReputation(address borrower) private returns (bool) {
        return true;
    }
}
