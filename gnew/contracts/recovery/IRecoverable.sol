// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
/// @notice Interfaz mínima de cuenta recuperable (propietario 
rotatable). 
interface IRecoverable { 
    function owner() external view returns (address); 
    function setOwner(address newOwner) external; 
} 
 
