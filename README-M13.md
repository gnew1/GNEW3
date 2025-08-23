
# M13: Paymasters ERC‑4337 con Políticas Dinámicas

## Entregables
- Contrato `/contracts/paymasters/DynamicPaymaster.sol`
- SDK `/services/paymaster-sdk/index.ts`
- Tests `/tests/paymaster/test_m13.spec.ts`
- CI `/ops/ci/m13-paymaster.yml`
- Runbook `/ops/runbooks/m13-paymaster.md`

## Commit sugerido


feat(paymaster): implementar M13 ERC‑4337 paymaster con políticas dinámicas


## Riesgos
- **Uso indebido por cuentas no autorizadas**: mitigado con allowlist.
- **Abuso de subsidio de gas**: mitigado con `maxGasFee`.
- **Cambios DAO maliciosos**: mitigado con gobernanza multiclave.


M_pointer actualizado: M14 ✅

