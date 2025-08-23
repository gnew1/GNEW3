
# M14: Resiliencia ante MEV y Ordenamiento Justo

## Entregables
- Contrato `/contracts/mev/FairOrdering.sol`
- SDK `/services/mev-guard/index.ts`
- Tests `/tests/mev/test_m14.spec.ts`
- CI `/ops/ci/m14-mev.yml`
- Runbook `/ops/runbooks/m14-mev.md`

## Commit sugerido


feat(mev): implementar commit-reveal en FairOrdering para mitigar MEV


## Riesgos
- **Liveness**: si usuarios no hacen reveal, los fondos quedan bloqueados.
- **Complejidad UX**: requiere 2 pasos de interacción. Mitigado con SDK y wallets.


M_pointer actualizado: M15 ✅

