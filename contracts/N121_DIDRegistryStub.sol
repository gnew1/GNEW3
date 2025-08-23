
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title N121_DIDRegistryStub
/// @notice Stub autocontenido del Registro DID (N121) para validación de emisor.
///         En producción debe ser reemplazado por el contrato N121 real.
contract N121_DIDRegistryStub {
    address public owner;

    // DID simple asociado a address (ej.: did:key:z... o did:pkh:eip155:1:0x...)
    mapping(address => string) public didOf;

    event DIDSet(address indexed who, string did);

    modifier onlyOwner() {
        require(msg.sender == owner, "onlyOwner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setDID(address who, string calldata did_) external onlyOwner {
        didOf[who] = did_;
        emit DIDSet(who, did_);
    }

    /// @notice Valida que el firmante sea el poseedor del DID registrado
    function isValidDIDSigner(address who, string calldata did_) external view returns (bool) {
        return keccak256(bytes(didOf[who])) == keccak256(bytes(did_));
    }
}


