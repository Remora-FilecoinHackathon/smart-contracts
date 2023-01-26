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
    mapping(uint256 => bytes) reputationRequest;
    mapping(bytes => uint256) reputationResponse;

    uint256 public currentId;
    address public oracle;

    constructor(address _oracle) {
        oracle = _oracle;
    }

    modifier onlyOracle {
        require(msg.sender == oracle);
        _;
    }

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
        require(positions[loanKey].lender != address(0));
        require(checkIsOwner(msg.sender, minerActorAddress));
        require(
            amount <= positions[loanKey].availableAmount &&
                block.timestamp < positions[loanKey].endTimestamp,
            "Lending position not available"
        );
        require(reputationResponse[minerActorAddress] == 2, "bad reputation");
        // (CREATE2) create Escrow. change owner and amount are placeholders. change them with Constructor params
        uint256 rate = calculateInterest(amount, positions[loanKey].interestRate);
        address escrow = address(
            new Escrow{salt: bytes32(abi.encodePacked(uint40(block.timestamp)))}(
                positions[loanKey].lender,
                msg.sender,
                minerActorAddress,
                amount,
                rate,
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
                rate, 
                escrow
            )
        );
        emit BorrowOrder(
            escrow,
            amount,
            positions[loanKey].availableAmount,
            block.timestamp,
            rate,
            loanKey,
            minerActorAddress
        );
    }

    function checkIsOwner(address borrower, bytes memory minerActorAddress) public returns (bool) {
        return MinerAPI.isControllingAddress(minerActorAddress, abi.encodePacked(borrower)).is_controlling;
    }

    function checkReputation(bytes memory minerActorAddress) public {
        uint256 Id = currentId;
        reputationRequest[Id] = minerActorAddress;
        incrementId();
        emit CheckReputation(Id, minerActorAddress);
    }

    function receiveReputationScore(uint requestId, uint256 response) external onlyOracle {
        bytes memory miner = reputationRequest[requestId];
        reputationResponse[miner] = response;
        // response: 0 false variable default, 1 response false, 2 response true
    }
    function calculateInterest(uint256 amount, uint256 bps) public pure returns (uint256) {
        require((amount * bps) >= 10_000);
         ((amount * bps) / 10_000);
         // using 833 bps returns the monthly rate to pay
        return calculatePeriodicaInterest(((amount * bps) / 10_000), 833);
    }
    function calculatePeriodicaInterest(uint256 amount, uint256 bps) internal pure returns (uint256) {
        require((amount * bps) >= 10_000);
        return ((amount * bps) / 10_000);
    }

    function incrementId() internal returns(uint256) {
        return currentId += 1;
    }
}
