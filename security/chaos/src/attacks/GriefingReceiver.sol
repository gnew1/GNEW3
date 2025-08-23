// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Contrato que siempre revierte al recibir ETH: DoS/griefing para push-payments.
contract GriefingReceiver {
    receive() external payable {
        revert("no thanks");
    }
}

