// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

interface IEscrow {
    error Loan_Already_Started();
    error Wrong_Owner();
    error Wrong_Beneficiary();
    error Not_The_Borrower(address);
    error Not_Enough_Balance(uint256);
    error Not_The_Borrower_Or_Lender(address, address);
    error Too_Early(uint256);
    error Loan_Already_Repaid(uint256);
    error Not_The_Lender(address);
    error Already_Started();
    error Loan_Not_Expired(uint256);
    
    event PaidRate(uint256 time, uint256 amount, uint256 paidAmount);
    event FailedPaidRate(uint256 time);
    event ClosedLoan(uint256 time, uint256 amount, uint256 paidAmount);
    event Received(address, uint256);
}
