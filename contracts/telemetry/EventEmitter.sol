
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * M15: Contrato para emitir eventos on-chain que serán recolectados por el servicio de telemetría.
 */
contract EventEmitter {
    event TelemetryEvent(bytes32 indexed traceId, string eventName, string payload);

    function emitEvent(bytes32 traceId, string calldata eventName, string calldata payload) external {
        emit TelemetryEvent(traceId, eventName, payload);
    }
}


