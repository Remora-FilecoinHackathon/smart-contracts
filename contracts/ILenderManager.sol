// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

interface ILenderManager {



    error Empty_Amount();
    error Loan_Period_Excedeed();
    error InterestRate_Too_High(uint256 max);
    error Empty_Lender();
    error Impossible_Borrower(address);
    error Loan_No_More_Available();
    error Miner_Reputation_Value();
    error Miner_Bad_Reputation();
    error No_Borrower_Permissions();

    event LenderPosition(
        address indexed lender,
        uint256 amount,
        uint256 key,
        uint256 endTimestamp,
        uint256 interestRate
    );

    event BorrowOrder(
        address escrow,
        uint256 loanAmount,
        uint256 amountToReapy,
        uint256 lenderAmountAvailable,
        uint256 startBlock,
        uint256 amountToPay,
        uint256 indexed key,
        bytes indexed minerActor
    );

    event CheckReputation(
        uint256 requestId, 
        string minerActor
    );

    struct BorrowerOrders {
        address borrower;
        uint256 loanAmount;
        uint256 amountToRepay;
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
