// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
/// @notice Contratos que reciben mensajes de BridgeMessenger deben 
implementar esta interfaz. 
interface IBridgeReceiver { 
    /// @dev Llamado por BridgeMessenger al finalizar un mensaje 
válido. 
    /// @param srcChainId chainId origen. 
    /// @param srcSender remitente en el chain origen (p. ej. Lockbox 
origen). 
    /// @param data carga útil ABI-encodificada, específica del 
receptor. 
    function onBridgeMessage(uint256 srcChainId, address srcSender, 
bytes calldata data) external; 
} 
 
 
