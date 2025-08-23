// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SafeOwnable2Step} from "../security/SafeOwnable2Step.sol";
import {Guards} from "../security/Guards.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Errors} from "../errors/Errors.sol";

/// @title Plantilla de Escrow con patrón Pull-Payment (evita reentrancia)
/// @dev C-E-I: checks (saldo/roles) → effects (actualiza deuda) → interaction (transfer al retirar)
contract PullPaymentEscrow is SafeOwnable2Step, Guards {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    mapping(address => uint256) public credits;

    event Deposited(address indexed payer, address indexed payee, uint256 amount);
    event Withdrawn(address indexed payee, uint256 amount);

    constructor(IERC20 _token) {
        if (address(_token) == address(0)) revert Errors.ZeroAddress();
        token = _token;
    }

    /// @notice El owner deposita créditos a favor de un beneficiario.
    function deposit(address payee, uint256 amount) external onlyOwner whenNotPaused {
        if (payee == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.InvalidAmount();
        // CHECKS: validaciones arriba
        // EFFECTS:
        credits[payee] += amount;
        emit Deposited(msg.sender, payee, amount);
        // INTERACTIONS:
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Retirada por el beneficiario (pull payment). Reentrancia mitigada.
    function withdraw() external whenNotPaused nonReentrantCEI {
        uint256 amount = credits[msg.sender];
        if (amount == 0) revert Errors.InvalidAmount();
        // EFFECTS:
        credits[msg.sender] = 0;
        emit Withdrawn(msg.sender, amount);
        // INTERACTIONS: single external call al final
        token.safeTransfer(msg.sender, amount);
    }

    /// @notice Pausa y reanuda por owner.
    function pause() external { _pauseOnlyOwner(msg.sender, owner()); }
    function unpause() external { _unpauseOnlyOwner(msg.sender, owner()); }
}

