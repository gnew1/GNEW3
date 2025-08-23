
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./N121_DIDRegistryStub.sol";

/// @title ContentRegistry (M1)
/// @notice Registro on-chain de evidencias de contenido inmutable (CID/ArweaveID + hash canónico)
contract ContentRegistry {
    struct Record {
        bytes32 contentHash;   // keccak256(bytesContenidoCanonico)
        string cid;            // IPFS CID (multihash base32)
        string arweaveId;      // TXID Arweave
        string did;            // DID del emisor (opcional pero recomendado)
        address submitter;     // msg.sender
        uint256 timestamp;     // block.timestamp
    }

    N121_DIDRegistryStub public didRegistry;

    // contentHash => Record
    mapping(bytes32 => Record) private records;

    event RecordRegistered(
        bytes32 indexed contentHash,
        string cid,
        string arweaveId,
        string did,
        address indexed submitter,
        uint256 timestamp
    );

    error AlreadyRegistered();
    error InvalidDID();

    constructor(address didRegistry_) {
        didRegistry = N121_DIDRegistryStub(didRegistry_);
    }

    /// @notice Registra un contenido inmutable. Si did != "", debe corresponder al signer.
    function registerRecord(
        bytes32 contentHash,
        string calldata cid,
        string calldata arweaveId,
        string calldata did
    ) external {
        if (records[contentHash].timestamp != 0) revert AlreadyRegistered();

        if (bytes(did).length > 0) {
            bool ok = didRegistry.isValidDIDSigner(msg.sender, did);
            if (!ok) revert InvalidDID();
        }

        records[contentHash] = Record({
            contentHash: contentHash,
            cid: cid,
            arweaveId: arweaveId,
            did: did,
            submitter: msg.sender,
            timestamp: block.timestamp
        });

        emit RecordRegistered(contentHash, cid, arweaveId, did, msg.sender, block.timestamp);
    }

    function getRecord(bytes32 contentHash)
        external
        view
        returns (
            bytes32,
            string memory,
            string memory,
            string memory,
            address,
            uint256
        )
    {
        Record memory r = records[contentHash];
        return (r.contentHash, r.cid, r.arweaveId, r.did, r.submitter, r.timestamp);
    }

    function isRegistered(bytes32 contentHash) external view returns (bool) {
        return records[contentHash].timestamp != 0;
    }
}


