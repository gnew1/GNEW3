// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SafeOwnable2Step} from "../security/SafeOwnable2Step.sol";
import {Guards} from "../security/Guards.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Errors} from "../errors/Errors.sol";

/// @title Plantilla de bóveda ERC20 con listas de permitidos y límites
/// @notice Ejemplo de patrón CEI + errores custom + pausa
contract SafeERC20Vault is SafeOwnable2Step, Guards {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    mapping(address => bool) public allowed;
    uint256 public maxPerTx;

    event Allowed(address indexed account, bool allowed);
    event MaxPerTxSet(uint256 newMax);
    event Pulled(address indexed from, uint256 amount);
    event Pushed(address indexed to, uint256 amount);

    constructor(IERC20 _asset, uint256 _maxPerTx) {
        if (address(_asset) == address(0)) revert Errors.ZeroAddress();
        asset = _asset;
        maxPerTx = _maxPerTx;
    }

    function setAllowed(address account, bool isAllowed) external onlyOwner {
        if (account == address(0)) revert Errors.ZeroAddress();
        allowed[account] = isAllowed;
        emit Allowed(account, isAllowed);
    }

    function setMaxPerTx(uint256 m) external onlyOwner {
        if (m == 0) revert Errors.InvalidAmount();
        maxPerTx = m;
        emit MaxPerTxSet(m);
    }

    /// @notice Pull de tokens desde un usuario permitido (requiere allowance).
    function pull(address from, uint256 amount) external whenNotPaused {
        if (!allowed[from]) revert Errors.Unauthorized();
        if (amount == 0 || amount > maxPerTx) revert Errors.InvalidAmount();
        uint256 balBefore = asset.balanceOf(address(this));
        asset.safeTransferFrom(from, address(this), amount);
        if (asset.balanceOf(address(this)) < balBefore + amount) revert Errors.CallFailed();
        emit Pulled(from, amount);
    }

    /// @notice Push de tokens a un destinatario (solo owner).
    function push(address to, uint256 amount) external onlyOwner whenNotPaused nonReentrantCEI {
        if (to == address(0)) revert Errors.ZeroAddress();
        if (amount == 0 || amount > maxPerTx) revert Errors.InvalidAmount();
        asset.safeTransfer(to, amount);
        emit Pushed(to, amount);
    }

    function pause() external { _pauseOnlyOwner(msg.sender, owner()); }
    function unpause() external { _unpauseOnlyOwner(msg.sender, owner()); }
}

