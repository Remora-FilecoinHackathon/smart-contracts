// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/utils/Actor.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/utils/Misc.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/SendAPI.sol";
import "./ILenderManager.sol";
import "./Escrow.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";
// We don't use openzeppelin it has some issues with Hyperspace
// import "@openzeppelin/contracts/utils/Counters.sol";

contract LenderManager is ILenderManager {
    mapping(uint256 => LendingPosition) public positions;
    mapping(uint256 => BorrowerOrders[]) public ordersForLending;
    mapping(uint256 => address[]) public escrowContracts;
    mapping(uint256 => bytes) public reputationRequest;
    mapping(bytes => uint256) public reputationResponse;
    uint256[] public loanKeys;
    uint256 public currentId;
    address public oracle;
    uint256 constant MINER_REPUTATION_DEFAULT = 0;
    uint256 constant MINER_REPUTATION_BAD = 1;
    uint256 constant MINER_REPUTATION_GOOD = 2;
    uint256 constant repayLoanInterval = 2592000;

    modifier onlyOracle() {
        require(msg.sender == oracle);
        _;
    }

    constructor(address _oracle) {
        oracle = _oracle;
    }

    function createLendingPosition(uint256 duration, uint256 loanInterestRate)
        public
        payable
    {
        require(msg.value > 0, "send some FIL to create a lending position");
        require(
            duration > block.timestamp,
            "duration must be greater than current timestamp"
        );
        uint256 key = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    msg.sender,
                    blockhash(block.number - 1)
                )
            )
        );
        positions[key] = LendingPosition(
            msg.sender,
            msg.value,
            duration,
            loanInterestRate
        );
        loanKeys.push(key);
        emit LenderPosition(
            msg.sender,
            msg.value,
            key,
            duration,
            loanInterestRate
        );
    }

    function createBorrow(
        uint256 loanKey,
        uint256 amount,
        bytes memory minerActorAddress
    ) public {
        require(positions[loanKey].lender != address(0));
        // TODO delete this comment require(isControllingAddress(msg.sender));
        require(
            amount <= positions[loanKey].availableAmount &&
                block.timestamp < positions[loanKey].endTimestamp,
            "Lending position not available"
        );
        //TODO delete this comment require(reputationResponse[minerActorAddress] == MINER_REPUATION_GOOD, "bad reputation");
        (uint256 rate, uint256 amountToRepay) = calculateInterest(
            amount,
            positions[loanKey].interestRate
        );
        Escrow escrow = new Escrow{
            salt: bytes32(abi.encodePacked(uint40(block.timestamp)))
        }(
            positions[loanKey].lender,
            msg.sender,
            minerActorAddress,
            amountToRepay,
            rate,
            repayLoanInterval,
            positions[loanKey].endTimestamp
        );
        escrowContracts[loanKey].push(payable(address(escrow)));
        (bool sent, ) = address(escrow).call{value: amount}("");
        require(sent, "Failed send to escrow");
        positions[loanKey].availableAmount -= amount;
        ordersForLending[loanKey].push(
            BorrowerOrders(
                msg.sender,
                amount,
                amountToRepay,
                block.timestamp,
                rate,
                address(escrow)
            )
        );
        emit BorrowOrder(
            address(escrow),
            amount,
            amountToRepay,
            positions[loanKey].availableAmount,
            block.timestamp,
            rate,
            loanKey,
            minerActorAddress
        );
    }
    
    function isControllingAddress(bytes memory minerActorAddress)
        public
        returns (bool)
    {
        return
            MinerAPI
                .isControllingAddress(
                    minerActorAddress,
                    abi.encodePacked(msg.sender)
                )
                .is_controlling;
    }

    function checkReputation(bytes memory minerActorAddress) public {
        uint256 id = currentId;
        reputationRequest[id] = minerActorAddress;
        incrementId();
        emit CheckReputation(id, minerActorAddress);
    }

    function receiveReputationScore(uint256 requestId, uint256 response)
        external
        onlyOracle
    {
        require(
            response == MINER_REPUTATION_GOOD ||
                response == MINER_REPUTATION_BAD,
            "bad value"
        );
        bytes memory miner = reputationRequest[requestId];
        reputationResponse[miner] = response;
    }

    function calculateInterest(uint256 amount, uint256 bps)
        public
        pure
        returns (uint256, uint256)
    {
        uint256 computedAmount = amount * bps;
        require(computedAmount >= 10_000);
        (computedAmount / 10_000);
        // using 833 bps returns the monthly rate to pay
        return (calculatePeriodicaInterest(((computedAmount + amount) / 10_000), 833), ((computedAmount + amount)));
    }

    function calculatePeriodicaInterest(uint256 amount, uint256 bps)
        private
        pure
        returns (uint256)
    {
        require((amount * bps) >= 10_000);
        return ((amount * bps) / 10_000);
    }

    function incrementId() private returns (uint256) {
        return currentId += 1;
    }
}
