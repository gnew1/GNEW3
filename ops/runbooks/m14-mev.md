
# Runbook M14 - Resiliencia ante MEV

## Objetivo
Prevenir el frontrunning y manipulación de ordenamiento de transacciones mediante commit-reveal.

## Flujo
1. Usuario envía `commit()` con hash(txData + salt).
2. Una vez minado, el usuario envía `reveal()` con txData y salt.
3. Contrato valida el compromiso y ejecuta la acción.

## DoD
- Tests unitarios con `hardhat` pasan.
- SDK funcional para commit y reveal.
- CI validando cada PR.


