// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Errors} from "../errors/Errors.sol";

/// @title RescueVault — bóveda de cuarentena para fondos rescatados.
contract RescueVault is Ownable2Step, Pausable {
    event Received(address indexed from, address indexed token, uint256 amount);
    event Withdrawn(address indexed to, address indexed token, uint256 amount);

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdraw(address token, address to, uint256 amount) external onlyOwner whenNotPaused {
        if (to == address(0) || amount == 0) revert Errors.InvalidAmount();
        if (token == address(0)) {
            (bool s, ) = to.call{value: amount}("");
            if (!s) revert Errors.CallFailed();
        } else {
            IERC20(token).transfer(to, amount);
        }
        emit Withdrawn(to, token, amount);
    }

    receive() external payable { emit Received(msg.sender, address(0), msg.value); }
    function onERC20Received(address from, address token, uint256 amount) external { emit Received(from, token, amount); }
}

