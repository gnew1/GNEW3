// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IVerifierGroth16.sol";

/// @dev Solo para testnets/desarrollo. Sustituir por contrato exportado con snarkjs.
contract MockGroth16Verifier is IVerifierGroth16 {
    bool public accept;
    constructor(bool _accept) { accept = _accept; }
    function setAccept(bool v) external { accept = v; }

    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata,
        uint[2] calldata,
        uint[] calldata
    ) external view returns (bool r) {
        return accept;
    }
}

