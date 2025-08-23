# N69 — Pausa/Rescate y Reembolsos

## Componentes
- `GuardianCouncil`: multisig on-chain con **quorum** y **allowlist** de contratos; pausa rápida y orquesta timelock.
- `EmergencyTimelock`: OZ Timelock para **operaciones de emergencia** con delay corto.
- `ProtectableVault`: ejemplo de contrato crítico con `pause()` y `emergencySweep()` restringido.
- `RescueVault`: bóveda de cuarentena (propiedad DAO).
- `RefundManagerMerkle`: gestión de reembolsos por Merkle (opcional `DenylistSimple`).

## Flujo
1. **Pausa** por quorum (fast).
2. **Sweep** programado y ejecutado via timelock (transparente).
3. **Reembolso** por Merkle.
4. **Unpause** por DAO.

## Configuración mínima
- Owner de contratos críticos = DAO (timelock principal).
- `EmergencyTimelock.minDelay` = 1–10 min según riesgo.
- `GuardianCouncil.quorum` ≥ 2/3 de guardianes.

 
Notas de integración y operación
●	Stack consistente con GNEW: reusa Errors.sol (N61), CI Foundry, y paneles (N68) para instrumentar tiempo de pausa y drill.

●	Activación por quorum/guardian: GuardianCouncil.fastPause() y propose/approve/schedule/execute.

●	Procedimiento de reembolso: RefundManagerMerkle + snapshot → root → claims.

●	Controles anti-abuso: allowlist de targets, quorum, rationaleHash (vincula a documento auditable), DAO canceler en timelock.

●	DoD: el workflow Emergency Drill (N69) ejecuta el test de punta a punta; úsalo como simulacro periódico.

¿Te agrego también la versión ETH nativa de RefundManager y un portal web (React) para claims con verificación del proof en el navegador?

