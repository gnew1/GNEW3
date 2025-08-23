// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Errors} from "../errors/Errors.sol";

/// @title ProtectableVault — ejemplo de contrato crítico con hooks de emergencia.
/// @dev Owner = DAO timelock principal. emergencyTimelock con rol especial para emergencySweep.
contract ProtectableVault is Pausable, Ownable2Step {
    address public immutable emergencyTimelock;

    event EmergencySwept(address indexed token, address indexed to, uint256 amount);

    constructor(address _emergencyTimelock) {
        if (_emergencyTimelock == address(0)) revert Errors.ZeroAddress();
        emergencyTimelock = _emergencyTimelock;
    }

    modifier onlyEmergency() {
        if (msg.sender != emergencyTimelock) revert Errors.Unauthorized();
        _;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// @notice Transferir fondos en emergencia (solo cuando está pausado).
    function emergencySweep(address token, address to, uint256 amount) external onlyEmergency {
        if (!paused()) revert Errors.InvalidState();
        if (to == address(0) || amount == 0) revert Errors.InvalidAmount();
        if (token == address(0)) {
            (bool s, ) = to.call{value: amount}("");
            if (!s) revert Errors.CallFailed();
        } else {
            IERC20(token).transfer(to, amount);
        }
        emit EmergencySwept(token, to, amount);
    }

    receive() external payable {}
}

