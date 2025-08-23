
# M18: FinOps de gas e infraestructura

## Entregables
- Servicio `/services/finops/gasOptimizer.ts`
- API `/apps/dao-web/pages/api/finops/gas.ts`
- Tests `/tests/finops/test_m18_gas.spec.ts`
- CI `/ops/ci/m18-finops.yml`
- Runbook `/ops/runbooks/m18-finops.md`

## Commit sugerido


feat(finops): módulo de optimización y métricas de gas (M18)


## Riesgos
- **Variabilidad de gasPrice**: mitigación → usar oráculos de gas.
- **RPC saturados**: mitigación → fallback a múltiples proveedores.


M_pointer actualizado: M19 ✅

