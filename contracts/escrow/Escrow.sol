// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Escrow {
    event PaidRate(uint256 time, uint256 amount);
    event FailedPaidRate(uint256 time);
    event CollateralWithdrawn(uint256 amount);
    event CollateralAdded(uint256 amount);
    event ClosedLoan(uint256 time, uint256 amount);
    event Received(address, uint256);

    constructor() payable {}

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
