
# M12: Seguridad de Cadena de Suministro

## Entregables
- Workflow SBOM `/ops/security/m12-sbom.yaml`.
- Script de verificación `/ops/security/m12-verify.sh`.
- Layout in-toto `/ops/security/m12-in-toto.layout`.
- Tests `/tests/security/test_m12_sbom.spec.ts`.
- Runbook `/ops/runbooks/m12-security-supplychain.md`.
- Script de despliegue `/scripts/deploy_m12.ts`.

## Commit sugerido


feat(security): implementar M12 seguridad de cadena de suministro con SBOM + SLSA + Sigstore


## Riesgos
- **Dependencias no firmadas**: algunas librerías no soportan firmas.
- **Mitigación**: validar SBOM y monitorizar advisories.
- **Costo de pipeline**: verificación añade minutos extra en CI.


M_pointer actualizado: M13 ✅

