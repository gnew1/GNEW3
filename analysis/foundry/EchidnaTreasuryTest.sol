
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/security/GovernanceTreasury.sol";

/// @notice Prueba fuzzing con Echidna
contract EchidnaTreasuryTest {
    GovernanceTreasury treasury;

    constructor() {
        treasury = new GovernanceTreasury(msg.sender);
    }

    function echidna_total_balance_matches() public view returns (bool) {
        return treasury.totalBalance() == address(treasury).balance;
    }
}


