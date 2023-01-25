// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

/*
 * First draft of the LendingManager contract. See TODO and optimize code
 */

// import "hardhat/console.sol";
import "./ILenderManager.sol";
import "./Escrow.sol";
import {MinerAPI} from "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import {MinerTypes} from "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";
import {Actor} from "@zondax/filecoin-solidity/contracts/v0.8/utils/Actor.sol";
import {Misc} from "@zondax/filecoin-solidity/contracts/v0.8/utils/Misc.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/SendAPI.sol";

// import "@openzeppelin/contracts/utils/Counters.sol";

contract LenderManager is ILenderManager {
    mapping(uint256 => LendingPosition) positions;
    mapping(uint256 => BorrowerOrders[]) ordersForLending;
    mapping(uint256 => address[]) escrowContracts;

    constructor() {}

    function createLendingPosition(uint256 duration, uint256 loanInterestRate) public payable {
        require(msg.value > 0, "send some FIL to create a lending position");
        require(duration > block.timestamp, "duration must be greater than current timestamp");
        uint256 key = uint256(
            keccak256(abi.encodePacked(block.timestamp, msg.sender, blockhash(block.number - 1)))
        );
        positions[key] = LendingPosition(msg.sender, msg.value, duration, loanInterestRate);
        emit LenderPosition(msg.sender, msg.value, key, duration, loanInterestRate);
    }

    function createBorrow(
        uint256 loanKey,
        uint256 amount,
        bytes memory minerActorAddress
    ) public {
        //TODO check on loanKey
        //TODO require(checkIsOwner(msg.sender, minerActorAddress));
        // require(checkReputation(minerActorAddress));
        require(
            amount <= positions[loanKey].availableAmount &&
                block.timestamp < positions[loanKey].endTimestamp,
            "Lending position not available"
        );
        // (CREATE2) create Escrow. change owner and amount are placeholders. change them with Constructor params
        address escrow = address(
            new Escrow{salt: bytes32(abi.encodePacked(uint40(block.timestamp)))}(
                positions[loanKey].lender,
                msg.sender,
                minerActorAddress,
                amount,
                positions[loanKey].endTimestamp
            )
        );
        escrowContracts[loanKey].push(payable(escrow));
        //send FIL to miner actor
        SendAPI.send(abi.encodePacked(escrow), amount);
        // update LendingPosition
        positions[loanKey].availableAmount -= amount;
        // update BorrowerOrders
        ordersForLending[loanKey].push(
            BorrowerOrders(
                msg.sender,
                amount,
                block.timestamp,
                calculateInterest(), //TODO
                escrow
            )
        );
        emit BorrowOrder(
            escrow,
            amount,
            positions[loanKey].availableAmount,
            block.timestamp,
            calculateInterest(),
            loanKey,
            minerActorAddress
        );
    }

    function checkIsOwner(address borrower, bytes memory minerActorAddress) public returns (bool) {
        // TODO convert msg.sender to Filecoin address form or viceversa in order to compare them
        // MinerTypes.GetOwnerReturn memory getOwnerReturnValue = MinerAPI.getOwner(minerActorID);
        // return msg.sender == getOwnerReturnValue.owner
        return true;
    }

    // function checkReputation(bytes memory minerActor ) public
    function checkReputation() public {
        // requestId => borrower
        emit CheckReputation(msg.sender);
    }

    // function receiveReputationScore(uint requestId, bytes memory response) external onlyOracle {

    // }

    //TODO
    function calculateInterest() internal view returns (uint256 amount) {}
}
