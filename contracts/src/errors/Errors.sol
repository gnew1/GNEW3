// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Conjunto estándar de errores personalizados para GNEW SC.
library Errors {
    error Unauthorized();             // No cumple rol/propietario
    error ZeroAddress();              // Dirección cero no permitida
    error InvalidAmount();            // Cantidad inválida
    error InvalidState();             // Estado inválido para la operación
    error Reentrancy();               // Intento de reentrancia detectado
    error CallFailed();               // Llamada externa fallida
    error Expired();                  // Plazo expirado
    error AlreadyInitialized();       // Doble init
    error NotPayable();               // Función no payable
}

