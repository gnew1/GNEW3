// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interfaz estándar Noir/Plonk (barretenberg) - el verificador suele ser generado y cumplir esta firma.
interface IPlonkVerifier {
    function verify(bytes calldata proof, uint256[] calldata publicInputs) external view returns (bool);
}

