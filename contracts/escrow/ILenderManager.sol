// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
contract ILenderManager {
    event LenderPosition(
        address lender,
        uint256 amount,
        uint256 key,
        uint256 endTimestamp,
        uint256 interestRate
    );

    event BorrowOrder(
        address escrow,
        uint256 loanAmount,
        uint256 lenderAmountAvailable,
        uint256 startBlock,
        uint256 amountToPay,
        uint256 key,
        bytes minerActor
    );

    event CheckReputation(
        uint256 requestId,
        bytes minerActor
    );

    struct BorrowerOrders {
        address borrower;
        uint256 loanAmount;
        uint256 startBlock; // when the loan starts
        uint256 amountToPayEveryBlock;
        address escrow;
    }

    struct LendingPosition {
        address lender;
        uint256 availableAmount;
        uint256 endTimestamp;
        uint256 interestRate;
    }
}

