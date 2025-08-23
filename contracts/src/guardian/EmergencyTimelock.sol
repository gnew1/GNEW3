// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title EmergencyTimelock (OZ) — timelock rápido solo para operaciones de emergencia.
/// @notice PROPOSER_ROLE = GuardianCouncil, EXECUTOR_ROLE = address(0) (cualquiera puede ejecutar cuando madura),
///         CANCELLER_ROLE = DAO/Timelock principal (puede cancelar si hay abuso/errores).
contract EmergencyTimelock is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address cancellerAdmin
    ) TimelockController(minDelay, proposers, executors, cancellerAdmin) {}
}

