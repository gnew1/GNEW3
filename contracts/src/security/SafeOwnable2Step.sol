// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Errors} from "../errors/Errors.sol";

/// @notice Propiedad segura con comprobaciones consistentes.
abstract contract SafeOwnable2Step is Ownable2Step {
    function _checkOwnerNotZero(address newOwner) internal pure {
        if (newOwner == address(0)) revert Errors.ZeroAddress();
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        _checkOwnerNotZero(newOwner);
        super.transferOwnership(newOwner);
    }
}

