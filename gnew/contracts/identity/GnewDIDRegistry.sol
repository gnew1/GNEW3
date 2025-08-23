// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* GnewDIDRegistry 
* - Registro y anclaje de DIDs (did:gnew, did:key, did:pkh, 
ION/Ceramic envueltos) 
* - Guarda docURI (ipfs://..., ceramic://..., ion:long) + contentHash 
(bytes32) y controlador 
* - CRUD: register, update, setController, revoke 
* - Roles: REGISTRAR_ROLE (DAO/Autoridad) y controller per-DID 
*/ 
import {AccessControl} from 
"openzeppelin-contracts/contracts/access/AccessControl.sol"; 
import {Strings} from 
"openzeppelin-contracts/contracts/utils/Strings.sol"; 
contract GnewDIDRegistry is AccessControl { 
using Strings for uint256; 
bytes32 public constant REGISTRAR_ROLE = 
keccak256("REGISTRAR_ROLE"); 
struct Record { 
        address controller;   // EOA/AA controlador (si aplica) 
        string  docURI;       // ipfs://..., ceramic://<streamId>, 
ion:<longform>... 
        bytes32 contentHash;  // digest del DID Document (keccak256 o 
multihash truncado a bytes32) 
        bool    revoked; 
        uint64  updatedAt; 
        uint64  version; 
    } 
 
    // didHash => record 
    mapping(bytes32 => Record) public records; 
 
    event DIDRegistered(string did, address controller, string docURI, 
bytes32 contentHash, uint64 version); 
    event DIDUpdated(string did, address controller, string docURI, 
bytes32 contentHash, uint64 version); 
    event DIDControllerChanged(string did, address oldController, 
address newController); 
    event DIDRevoked(string did, address controller); 
 
    constructor(address admin, address registrar) { 
        _grantRole(DEFAULT_ADMIN_ROLE, admin); 
        _grantRole(REGISTRAR_ROLE, registrar); 
    } 
 
    // --- Helpers --- 
 
    function _hashDID(string memory did) internal pure returns 
(bytes32) { 
        // Normalizar a minúsculas ASCII (DID method are 
case-insensitive en método; aquí simplificamos) 
        bytes memory b = bytes(did); 
        for (uint i=0; i<b.length; i++) { 
            uint8 c = uint8(b[i]); 
            if (c >= 65 && c <= 90) { // 'A'..'Z' 
                b[i] = bytes1(c + 32); 
            } 
        } 
        return keccak256(b); 
    } 
 
    modifier onlyController(string memory did) { 
        bytes32 id = _hashDID(did); 
        require(records[id].controller == msg.sender, "not 
controller"); 
        _; 
    } 
 
    function getRecord(string memory did) external view returns 
(Record memory) { 
        return records[_hashDID(did)]; 
    } 
 
    // --- Register --- 
 
    /// @notice Registro auto-gestionado por controller (EOA/AA). 
Único si no existe. 
    function registerByController( 
        string calldata did, 
        string calldata docURI, 
        bytes32 contentHash 
    ) external { 
        bytes32 id = _hashDID(did); 
        require(records[id].controller == address(0), "exists"); 
        records[id] = Record({ 
            controller: msg.sender, 
            docURI: docURI, 
            contentHash: contentHash, 
            revoked: false, 
            updatedAt: uint64(block.timestamp), 
            version: 1 
        }); 
        emit DIDRegistered(did, msg.sender, docURI, contentHash, 1); 
    } 
 
    /// @notice Registro por la Autoridad/DAO para DIDs no-EVM 
(did:key, ION, etc.) 
    function registerByRegistrar( 
        string calldata did, 
        address controller, 
        string calldata docURI, 
        bytes32 contentHash 
    ) external onlyRole(REGISTRAR_ROLE) { 
        bytes32 id = _hashDID(did); 
        require(records[id].controller == address(0), "exists"); 
        records[id] = Record({ 
            controller: controller, 
            docURI: docURI, 
            contentHash: contentHash, 
            revoked: false, 
            updatedAt: uint64(block.timestamp), 
            version: 1 
        }); 
        emit DIDRegistered(did, controller, docURI, contentHash, 1); 
    } 
 
    // --- Update --- 
 
    function updateDocument( 
        string calldata did, 
        string calldata newDocURI, 
        bytes32 newContentHash 
    ) external onlyController(did) { 
        bytes32 id = _hashDID(did); 
        Record storage r = records[id]; 
        require(!r.revoked, "revoked"); 
        r.docURI = newDocURI; 
        r.contentHash = newContentHash; 
        r.updatedAt = uint64(block.timestamp); 
        r.version += 1; 
        emit DIDUpdated(did, msg.sender, newDocURI, newContentHash, 
r.version); 
    } 
 
    /// @notice Cambio de controlador (ej. rotación a un AA o 
multisig) 
    function setController(string calldata did, address newController) 
external onlyController(did) { 
        bytes32 id = _hashDID(did); 
        Record storage r = records[id]; 
        address old = r.controller; 
        r.controller = newController; 
        r.updatedAt = uint64(block.timestamp); 
        emit DIDControllerChanged(did, old, newController); 
    } 
 
    // --- Revoke --- 
 
    function revoke(string calldata did) external onlyController(did) 
{ 
        bytes32 id = _hashDID(did); 
        Record storage r = records[id]; 
        require(!r.revoked, "already"); 
        r.revoked = true; 
        r.updatedAt = uint64(block.timestamp); 
        emit DIDRevoked(did, msg.sender); 
    } 
} 
 
 
