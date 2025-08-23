
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * M13: Paymasters ERC-4337 con políticas dinámicas.
 * Basado en Account Abstraction (ERC-4337).
 * Este contrato permite patrocinar transacciones bajo reglas dinámicas.
 */

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@account-abstraction/contracts/interfaces/UserOperation.sol";

contract DynamicPaymaster is BasePaymaster {
    mapping(address => bool) public allowlist;
    uint256 public maxGasFee;
    address public daoGovernance;

    event PolicyUpdated(address indexed updater, uint256 newMaxGasFee);
    event AllowlistUpdated(address indexed account, bool allowed);

    modifier onlyDAO() {
        require(msg.sender == daoGovernance, "Solo DAO");
        _;
    }

    constructor(IEntryPoint _entryPoint, address _daoGovernance) BasePaymaster(_entryPoint) {
        daoGovernance = _daoGovernance;
        maxGasFee = 1 gwei;
    }

    function updatePolicy(uint256 _maxGasFee) external onlyDAO {
        maxGasFee = _maxGasFee;
        emit PolicyUpdated(msg.sender, _maxGasFee);
    }

    function setAllowlist(address account, bool allowed) external onlyDAO {
        allowlist[account] = allowed;
        emit AllowlistUpdated(account, allowed);
    }

    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32,
        uint256 requiredPreFund
    ) internal view override returns (bytes memory context, uint256 validationData) {
        require(userOp.maxFeePerGas <= maxGasFee, "Gas fee excede política");
        require(allowlist[userOp.sender], "Cuenta no permitida");
        return ("", 0);
    }

    function _postOp(PostOpMode, bytes calldata, uint256) internal override {}
}


