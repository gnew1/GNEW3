// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {Errors} from "../errors/Errors.sol";

/// @title Ejemplo de contrato UUPS con owner y pausa
/// @dev Usa Initializable para evitar constructor y proteger init
contract UUPSUpgradeableExample is Initializable, UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable {
    uint256 public value;

    event ValueSet(uint256 oldValue, uint256 newValue);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, uint256 initialValue) public initializer {
        if (initialOwner == address(0)) revert Errors.ZeroAddress();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __Pausable_init();
        value = initialValue;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setValue(uint256 newValue) external onlyOwner whenNotPaused {
        uint256 old = value;
        value = newValue;
        emit ValueSet(old, newValue);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}

