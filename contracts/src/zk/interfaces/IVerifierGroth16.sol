// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interfaz compatible con verificador Groth16 generado por snarkjs.
interface IVerifierGroth16 {
    function verifyProof(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[] calldata input
    ) external view returns (bool r);
}

