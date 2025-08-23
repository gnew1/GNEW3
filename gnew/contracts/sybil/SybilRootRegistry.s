 ol 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* SybilRootRegistry 
* - Igual patrón que ReputationRootRegistry: ancla Merkle root de 
"trustScore/risk" por epoch. 
* - Guarda formulaHash, codeHash e ipfsURI con artefactos (scores, 
config y README.audit). 
*/ 
import {AccessControl} from 
"openzeppelin-contracts/contracts/access/AccessControl.sol"; 
contract SybilRootRegistry is AccessControl { 
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE"); 
 
    struct RootMeta { 
        bytes32 merkleRoot;  // raíz de (address, riskMilli, version) 
        bytes32 formulaHash; // hash de config YAML 
        bytes32 codeHash;    // hash del pipeline (zip) 
        string  ipfsURI;     // artefactos y muestra audit 
        uint64  updatedAt; 
        uint32  version; 
    } 
 
    mapping(uint64 => RootMeta) public epochs; 
    event RootAnchored(uint64 indexed epoch, bytes32 merkleRoot, 
uint32 version, string ipfsURI); 
 
    constructor(address admin, address updater) { 
        _grantRole(DEFAULT_ADMIN_ROLE, admin); 
        _grantRole(UPDATER_ROLE, updater); 
    } 
 
    function anchorRoot( 
        uint64 epoch, 
        bytes32 merkleRoot, 
        uint32 version, 
        bytes32 formulaHash, 
        bytes32 codeHash, 
        string calldata ipfsURI 
    ) external onlyRole(UPDATER_ROLE) { 
        epochs[epoch] = RootMeta({ 
            merkleRoot: merkleRoot, 
            formulaHash: formulaHash, 
            codeHash: codeHash, 
            ipfsURI: ipfsURI, 
            updatedAt: uint64(block.timestamp), 
            version: version 
        }); 
        emit RootAnchored(epoch, merkleRoot, version, ipfsURI); 
    } 
 
    function getRoot(uint64 epoch) external view returns (RootMeta 
memory) { return epochs[epoch]; } 
} 
 
 
