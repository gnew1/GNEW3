
# Runbook M15 - Telemetría end-to-end

## Objetivo
Correlacionar eventos on-chain y off-chain con un modelo de trazas.

## Flujo
1. SDK `TelemetryCollector` registra eventos off-chain.
2. Subscripción a contratos EVM recolecta logs on-chain.
3. Se unifican en `telemetry.log` y exportaciones JSON.
4. CI valida integridad de los tests.

## DoD
- Tests unitarios verdes.
- API web registra eventos en disco.
- Hook `useTelemetry` disponible en app DAO.


