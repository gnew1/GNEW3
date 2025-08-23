
# M16: Gobierno del dato, retención y cifrado por campo

## Entregables
- Servicio `/services/data-governance/fieldEncryptor.ts`
- Hook `/apps/dao-web/hooks/useDataGovernance.ts`
- API `/apps/dao-web/pages/api/data-governance/encrypt.ts`
- Tests `/tests/data-governance/test_m16.spec.ts`
- CI `/ops/ci/m16-data-governance.yml`
- Runbook `/ops/runbooks/m16-data-governance.md`

## Commit sugerido


feat(data-governance): cifrado por campo y control de retención de datos sensibles


## Riesgos
- **Gestión de claves**: claves débiles comprometen datos → mitigación: KMS/HSM.
- **Rendimiento**: cifrado campo a campo añade latencia → mitigación: batch y cache.


M_pointer actualizado: M17 ✅

