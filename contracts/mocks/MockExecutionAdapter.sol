// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockExecutionAdapter {
    event MockSwapExecuted(bytes32 indexed proposalHash, uint256 amountIn, uint256 minAmountOut, address indexed caller);

    function executeSwap(bytes32 proposalHash, uint256 amountIn, uint256 minAmountOut) external returns (bytes32) {
        emit MockSwapExecuted(proposalHash, amountIn, minAmountOut, msg.sender);
        return keccak256(abi.encode(proposalHash, amountIn, minAmountOut, msg.sender));
    }
}
