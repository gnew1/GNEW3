
# M4: Refuerzo Anti-Sybil con Verificación de Identidad

## DoD
- API REST `/api/sybil-score` lista y funcional.
- Contrato `SybilGate.sol` validando elegibilidad por oráculo.
- Test unitarios en TypeScript.
- Quality gate en CI para cambios en lógica Anti-Sybil.

## Ejecución
```bash
npm test -- --runTestsByPath tests/identity/sybil-score.test.ts
npx hardhat compile

Commit sugerido
feat(identity): módulo anti-Sybil con API REST + contrato SybilGate (M4)

Riesgos

Dependencia externa Gitcoin/BrightID: mitigado con fallback score=0.

Privacidad de grafos: se evita exposición de datos sensibles, solo score final.


**M_pointer actualizado: M5**


/ops/runbooks/m5-chaos-game-day.md

# M5: Game Days y Chaos Engineering en GNEW

## Objetivo
Probar la resiliencia del sistema GNEW mediante la ejecución periódica de **Game Days**,
inyectando fallos controlados en servicios críticos (DAO, bridges, storage, identidad)
y validando la recuperación automática con **Litmus** y **Gremlin**.

---

## Alcance inicial
- Servicios a cubrir:
  - `/services/storage/`
  - `/services/identity/`
  - `/contracts/*`
- Eventos simulados:
  - Pérdida de nodo IPFS.
  - Caída de pod en Kubernetes (orquestación DAO).
  - Latencia artificial en API de identidad.

---

## Procedimiento de Game Day
1. **Preparación**
   - Confirmar ventanas de mantenimiento.
   - Habilitar feature flags de resiliencia.
   - Documentar hipótesis de fallo.

2. **Ejecución**
   - Lanzar escenarios con LitmusChaos.
   - Validar métricas en Prometheus/Grafana.
   - Confirmar que los *alerts* se disparan.

3. **Recuperación**
   - Documentar MTTR (Mean Time To Recovery).
   - Ejecutar rollback o autoescalado.

4. **Retroalimentación**
   - Revisar hallazgos en retro de SRE.
   - Crear issues de deuda técnica.

---

## Métricas DoD
- Tiempo medio de detección (MTTD) < 30s.
- Tiempo medio de recuperación (MTTR) < 2m.
- Logs correlacionados con tags `chaos-experiment=true`.

---
Este documento fue movido a `docs/modules/M4.md`.
## Referencias

- N95: Runbooks de contingencia

- [LitmusChaos](https://litmuschaos.io/)
