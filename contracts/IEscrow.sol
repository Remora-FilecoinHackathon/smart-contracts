// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

interface IEscrow {
    event PaidRate(uint256 time, uint256 amount, uint256 paidAmount);
    event FailedPaidRate(uint256 time);
    event ClosedLoan(uint256 time, uint256 amount, uint256 paidAmount);
    event Received(address, uint256);
}
