// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Cofre vulnerable: patrón push sin CEI, susceptible a reentrancia (para entrenamiento).
contract VulnerableVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        require(msg.value > 0, "zero");
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "no balance");
        // ❌ Interacción antes de efectos (violación CEI)
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "call failed");
        balances[msg.sender] = 0; // efectos al final → vulnerable
    }

    receive() external payable {}
}

