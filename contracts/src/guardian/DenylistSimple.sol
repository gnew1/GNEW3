// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Errors} from "../errors/Errors.sol";

/// @dev Lista de exclusión administrada por la DAO/Legal (para cumplimiento sanciones, fraude, etc.).
contract DenylistSimple is Ownable2Step {
    mapping(address => bool) public blocked;
    event Updated(address indexed who, bool status);
    function set(address who, bool status) external onlyOwner {
        if (who == address(0)) revert Errors.ZeroAddress();
        blocked[who] = status; emit Updated(who, status);
    }
}

