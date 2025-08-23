```md 
# Runbook de Incidentes — GNEW 
> Tiempo objetivo de recuperación (TTR): **< 15 minutos** para SEV‑1. 
## A) Reentrancy / Drains en rutas críticas 
**Detección:** subida brusca de `gnew_tx_failures_total` / 
comportamientos anómalos.   
**Acción:** 
1. `panic:pause-all` (TX única vía `PauseGuardian`). 
2. Revisión de call traces en Tenderly/Blockscout. 
3. Confirmar que `ReentrancyGuard` estuvo activo (si no, aplicar 
hotfix). 
4. Reopen cuando haya parches paramétricos o bloqueo de atacante 
(revoke roles/sanctions).   
**Validación:** pruebas locales/Shadow-Fork. 
## B) Slashing injusto (oráculo comprometido) 
1. `panic:pause-all`. 
2. `panic:freeze-slasher --compromised 0x...`. 
3. `openAppeal` en propuestas pendientes si es necesario (comité). 
4. `resolveAppeal(..., false)` para anular slashes injustos. 
5. `panic:unpause-all`.   
**Validación:** `operatorInfo` estable y balances sin pérdida. 
## C) Faucet abuse / Spam 
1. Solo pausar `GnewGovToken` (si tiene faucet) o ajustar 
`FAUCET_AMOUNT=0` vía upgrade/param si aplica. 
2. `panic:unpause-all`. 
## D) Congestión / costos altos - Mantener contratos activos si no hay riesgo de seguridad.   - Escalar `unbondingWindow` si hace falta para estabilizar salidas.   - Reabrir tras confirmación de estabilidad. 
## E) Procedimiento de *Rollback* (UUPS) - Si el incidente fue causado por una implementación nueva: 
1. Pausa. 
2. Ejecutar `scripts/rollbackUUPS.ts` (ver N8). 
3. Reabrir. --- 
## Checklists operativas 
### Pre‑requisitos - `PAUSER_ROLE` concedido a `PauseGuardian` en **todos** los contratos 
core. - Variables de entorno (`.env`) completas: `GOV_TOKEN_ADDRESS`, 
`STAKING_MANAGER_ADDRESS`, `GUARDIAN_ADDRESS`. 
### Pausa rápida (≤60s) 
```bash 
export NETWORK=holesky 
npx hardhat panic:pause-all --network $NETWORK 
Despausa (≤60s) 
npx hardhat panic:unpause-all --network $NETWORK 
Rotación mínima de SLASHER_ROLE (≤2 min) 
# revocar 
npx hardhat panic:freeze-slasher --compromised 0xBad --network 
$NETWORK 
# conceder a nuevo oráculo (manual) 
npx hardhat run --network $NETWORK scripts/grantRole.ts 
Validaciones post‑incidente (≤10 min) 
● paused() = false en Gov/Utility/Staking. 
● TX de Slashed coherentes (sin ejecuciones inesperadas). 
● Métricas a verde: gnew_tx_failure_rate < 1% (N5). 
