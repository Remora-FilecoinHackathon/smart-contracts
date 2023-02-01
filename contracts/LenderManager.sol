// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/utils/Actor.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/utils/Misc.sol";
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
    uint256 constant REPAY_LOAN_INTERVAL = 30 days;
    bytes private constant ALPHABET = "0123456789abcdef";

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
        if (msg.value <= 0)
            revert Empty_Amount();
        if (block.timestamp >= duration)
            revert Loan_Period_Excedeed();
        if (loanInterestRate >= 10000)
            revert InterestRate_Too_High(10000);
            
        // generate pseudo-random key used to manage Lending positions    
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
        
        if (positions[loanKey].lender == address(0))
            revert Empty_Lender();
        if (msg.sender == positions[loanKey].lender)
            revert Impossible_Borrower(msg.sender);
        if (amount > positions[loanKey].availableAmount || block.timestamp > positions[loanKey].endTimestamp)
            revert Loan_No_More_Available();
        if(reputationResponse[minerActorAddress] != MINER_REPUTATION_GOOD)
            revert Miner_Bad_Reputation();
        if(!isControllingAddress(minerActorAddress))
            revert No_Borrower_Permissions();

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
            REPAY_LOAN_INTERVAL,
            positions[loanKey].endTimestamp
        );
        (bool sent, ) = address(escrow).call{value: amount}("");
        require(sent, "Failed send to escrow");
        positions[loanKey].availableAmount -= amount;
        escrowContracts[loanKey].push(payable(address(escrow)));
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

    function checkReputation(bytes memory minerActorAddress) public {
        uint256 id = currentId;
        reputationRequest[id] = minerActorAddress;
        incrementId();
        string memory minerActor = toString(minerActorAddress);
        emit CheckReputation(id, minerActor);
    }

    function receiveReputationScore(uint256 requestId, uint256 response)
        external
        onlyOracle
    {
        if(response != MINER_REPUTATION_GOOD || response != MINER_REPUTATION_BAD)
            revert Miner_Reputation_Value();
        bytes memory miner = reputationRequest[requestId];
        reputationResponse[miner] = response;
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

    function calculateInterest(uint256 amount, uint256 bps)
        public
        pure
        returns (uint256, uint256)
    {
        uint256 computedAmount = amount * bps;
        require(computedAmount >= 10_000, "wrong math");
        uint256 computed = (computedAmount / 10_000);
        // using 833 bps returns the monthly rate to pay
        return (
            calculatePeriodicaInterest(
                ((computedAmount + amount) / 10_00),
                833
            ),
            ((computed + amount))
        );
    }

    function calculatePeriodicaInterest(uint256 amount, uint256 bps)
        private
        pure
        returns (uint256)
    {
        require((amount * bps) >= 10_000, "wrong math");
        return ((amount * bps) / 10_000);
    }

    function incrementId() private returns (uint256) {
        return currentId += 1;
    }

    function toString(bytes memory data) internal pure returns (string memory) {
        return string(abi.encodePacked(toStringRaw(data)));
    }

    function toStringRaw(bytes memory data)
        internal
        pure
        returns (bytes memory str)
    {
        str = new bytes(data.length * 2);
        for (uint256 i = 0; i < data.length; i++) {
            str[i * 2] = ALPHABET[uint256(uint8(data[i] >> 4))];
            str[i * 2 + 1] = ALPHABET[uint256(uint8(data[i] & 0x0f))];
        }
    }
}
