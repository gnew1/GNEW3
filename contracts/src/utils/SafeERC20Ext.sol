// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Errors} from "../errors/Errors.sol";

library SafeERC20Ext {
    using SafeERC20 for IERC20;

    function safePull(
        IERC20 token,
        address from,
        address to,
        uint256 amount
    ) internal {
        if (to == address(0) || from == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.InvalidAmount();
        // checks
        uint256 balBefore = token.balanceOf(to);
        // effects: none (pull pattern)
        // interactions: single external call (transferFrom) al final del check local
        token.safeTransferFrom(from, to, amount);
        // post-condition
        if (token.balanceOf(to) < balBefore + amount) revert Errors.CallFailed();
    }
}

