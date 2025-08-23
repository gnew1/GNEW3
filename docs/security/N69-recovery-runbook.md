# N69 — Runbook de Recuperación de Fondos (Post-exploit)

**Objetivo:** mecanismos para **rescatar/pausar** de forma segura con gobernanza.  
**Roles:** Seguridad, Gobernanza (DAO), Legal.

---

## 0) Preparación (antes del incidente)
- Contratos críticos implementan **hooks**: `pause()` y `emergencySweep()` (solo `EmergencyTimelock`).
- Desplegados:
  - `GuardianCouncil` (multisig on-chain M-de-N) con **quorum** configurado.
  - `EmergencyTimelock` (minDelay corto: p. ej., 1–10 minutos), con:
    - PROPOSER: `GuardianCouncil`
    - EXECUTOR: cualquiera
    - CANCELLER: DAO/Timelock principal
  - `RescueVault` (+ propietario DAO).
  - `RefundManagerMerkle` (por activo).
- **Permitir-lista** de **targets** en `GuardianCouncil` (solo contratos críticos).

## 1) Detección y contención
1. Seguridad levanta incidente → `rationale` (IPFS/URL) con detalles.
2. Guardianes (≥ quorum) ejecutan **pausa rápida**:
   ```solidity
   council.fastPause(target, keccak256("ipfs://..."));

3.	Validar en monitor: target paused()==true.

2) Rescate (movimiento a cuarentena)
Proponer y aprobar barrido hacia RescueVault (solo si paused()):

 bytes data = abi.encodeWithSignature(
  "emergencySweep(address,address,uint256)", token, rescueVault, amount
);
bytes32 id = council.proposeAction(target, data, rationaleHash);
council.approve(id); /* más guardianes hasta quorum */
council.scheduleViaTimelock(id, 0x00, keccak256("salt"));
// esperar minDelay
council.executeViaTimelock(id, 0x00, keccak256("salt"));
1.	
2.	DAO puede cancelar si considera que hay abuso: EmergencyTimelock.cancel(...).

3) Reembolso a víctimas
1.	Generar snapshot de víctimas y montos → árbol Merkle → publicar root.

2.	DAO actualiza RefundManagerMerkle.setRoot(root).

3.	Transferir fondos desde RescueVault → RefundManager.

4.	Abrir portal de claims (off-chain) → usuarios reclaman con proof.

5.	Denylist: Legal puede bloquear direcciones si es requerido.

4) Reinicio / post-mortem
●	Una vez mitigado: unpause por DAO y plan de migración si aplica.

●	Post-mortem público y verificación comunitaria (hash en on-chain rationaleHash).

DoD — Simulacro exitoso
●	Test de extremo a extremo (GuardianFlow.t.sol) verde en CI.

●	Tiempo desde detección hasta pausa < X min (métrica).

●	Reembolso completo procesado; auditoría de eventos y logs compartida.

Riesgos & Controles
●	Abuso:

○	Controles: quorum on-chain, permitir-lista de contracts/funciones, timelock con ventana de cancelación y rationaleHash anclado.

○	Gobernanza: DAO como canceller; reporte público.

●	Errores de barrido:

○	Solo permitido cuando paused().

○	Timelock ejecuta llamadas atómicas y registradas (eventos).

●	Privacidad: claims usan Merkle; no publicar listas con PII.


/github/workflows/emergency-drill.yml
```yaml
name: Emergency Drill (N69)
on:
  workflow_dispatch: {}
  schedule:
    - cron: "0 4 * * 6"  # Sábados 04:00 CET
jobs:
  simulate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1
        with: { version: nightly }
      - name: Run drill tests
        working-directory: contracts
        run: |
          forge test -vv --match-path 'test/guardian/GuardianFlow.t.sol'

