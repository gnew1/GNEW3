
# Runbook M13 - Paymasters ERC-4337 Dinámicos

## Objetivo
Gestionar subsidios de gas dinámicos bajo control DAO.

## Pasos
1. DAO ajusta `maxGasFee` mediante `updatePolicy()`.
2. DAO autoriza cuentas mediante `setAllowlist()`.
3. Los usuarios autorizados pueden enviar UserOperations subsidiadas.
4. CI ejecuta tests automáticos en cada PR.

## DoD
- Contrato desplegado y probado en testnet.
- SDK disponible para apps.
- Tests unitarios pasan en CI.
- Runbook documentado.


