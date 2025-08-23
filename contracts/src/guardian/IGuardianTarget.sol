// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface mínima que los contratos críticos deben implementar para ser gestionados en emergencia.
interface IGuardianTarget {
    function pause() external;
    function unpause() external;
    /// @dev Opcional: barrido de activos en modo emergencia (solo bajo timelock de emergencia).
    function emergencySweep(address token, address to, uint256 amount) external;
}

