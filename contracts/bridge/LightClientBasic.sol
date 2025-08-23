// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
 
import "@openzeppelin/contracts/access/AccessControl.sol"; 
 
/// @title LightClientBasic (PoC) 
/// @notice Almacena hashes de eventos del chain origen. Un "updater" 
(relayer/observadores) 
///         puede publicar el hash observado para (chainId, eventId). 
BridgeMessenger usará 
///         estos valores como "verdad" durante 
finalización/challenge. 
contract LightClientBasic is AccessControl { 
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE"); 
 
    // chainId => eventId => eventHash 
    mapping(uint256 => mapping(bytes32 => bytes32)) public 
eventHashOf; 
 
    event EventHashUpdated(uint256 indexed chainId, bytes32 indexed 
eventId, bytes32 eventHash, address indexed updater); 
 
    constructor(address admin) { 
        _grantRole(DEFAULT_ADMIN_ROLE, admin); 
        _grantRole(UPDATER_ROLE, admin); 
    } 
 
    function updateEventHash(uint256 chainId, bytes32 eventId, bytes32 
eventHash) external onlyRole(UPDATER_ROLE) { 
        eventHashOf[chainId][eventId] = eventHash; 
        emit EventHashUpdated(chainId, eventId, eventHash, 
msg.sender); 
    } 
 
    function getEventHash(uint256 chainId, bytes32 eventId) external 
view returns (bytes32) { 
        return eventHashOf[chainId][eventId]; 
    } 
} 
 
 
