
# Runbook M18 - FinOps de gas e infraestructura

## Objetivo
- Estimar costes de gas en operaciones EVM.
- Ofrecer métricas de coste y consumo.
- Detectar anomalías de gasto.

## Flujo
1. API recibe `tx` y `functionName`.
2. GasOptimizer estima gas y precio.
3. Respuesta incluye gas, precio y coste en ETH.
4. Integración con dashboard de métricas.

## DoD
- Tests unitarios ejecutados en CI.
- Estimaciones de gas correctas contra anvil.
- Runbook documentado.


