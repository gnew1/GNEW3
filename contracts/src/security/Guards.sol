// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Errors} from "../errors/Errors.sol";

/// @notice Conjunto de guardas estándar: reentrancy + pausa.
abstract contract Guards is ReentrancyGuard, Pausable {
    modifier nonReentrantCEI() {
        // Igual que nonReentrant pero explícito en patrón CEI.
        if (_status == _ENTERED) revert Errors.Reentrancy();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    function _requireNotPaused() internal view {
        if (paused()) revert Errors.InvalidState();
    }

    function _pauseOnlyOwner(address sender, address owner) internal {
        if (sender != owner) revert Errors.Unauthorized();
        _pause();
    }

    function _unpauseOnlyOwner(address sender, address owner) internal {
        if (sender != owner) revert Errors.Unauthorized();
        _unpause();
    }
}

