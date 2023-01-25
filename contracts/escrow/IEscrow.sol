// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

contract IEscrow {
    event PaidRate(uint256 time, uint256 amount);
    event FailedPaidRate(uint256 time);
    event CollateralWithdrawn(uint256 amount);
    event CollateralAdded(uint256 amount);
    event ClosedLoan(uint256 time, uint256 amount);
    event Received(address, uint256);
}
