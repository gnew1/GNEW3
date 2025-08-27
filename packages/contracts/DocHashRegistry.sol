
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DocHashRegistry
/// @notice Registro simple de hashes (SHA-256 como bytes32) vinculados a (docId, version).
contract DocHashRegistry {
    error DocHashRegistry__AlreadyRegistered(bytes32 hash);
    struct Record {
        string docId;
        uint256 version;
        address by;
        uint256 blockTime;
    }

    mapping(bytes32 => Record) private records;

    event Registered(bytes32 indexed hash, string docId, uint256 version, address indexed by);

    /// @dev Registra un hash. Si ya existe, revierte (inmutabilidad).
    function registerDocument(bytes32 hash, string calldata docId, uint256 version) external {
        if (records[hash].by != address(0)) {
            revert DocHashRegistry__AlreadyRegistered(hash);
        }
        records[hash] = Record({ docId: docId, version: version, by: msg.sender, blockTime: block.timestamp });
        emit Registered(hash, docId, version, msg.sender);
    }

    /// @dev Consulta registro; si no existe, docId será cadena vacía.
    function getRecord(bytes32 hash) external view returns (string memory docId, uint256 version, address by, uint256 blockTime) {
        Record memory r = records[hash];
        return (r.docId, r.version, r.by, r.blockTime);
    }
}

Notas de cumplimiento del prompt

Versionado: endpoint para nuevas versiones con hash SHA‑256 persistido.

On‑chain: adaptador Ethers + contrato DocHashRegistry para registrar bytes32(hash) y consultar el registro.

Firmas: verificación de Ed25519 / RSA‑PSS / ECDSA sobre contenido o hash.

Diffs: GET /documents/:id/versions/:ver/diff devuelve diff unificado legible.

Integridad verificable: GET /verify/:id/:ver compara local vs on‑chain.

Siguiente N (+1): N167 – Cifrado E2E de archivos (KMS/HSM, envelopes, ABAC).

