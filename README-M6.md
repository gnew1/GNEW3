
# M6: Gestión Activa de Deuda Técnica

## Entregables
- Métricas DORA (`/ops/metrics/m6-dora-metrics.ts`).
- Quality Gates (`/ops/runbooks/m6-quality-gates.md`).
- CI integrado con SonarQube y Codecov (`/ops/ci/m6-deuda-tecnica.yml`).
- Tests unitarios (`/tests/metrics/m6-dora-metrics.test.ts`).

## Commit sugerido


feat(quality): módulo M6 con DORA metrics, SonarQube, Codecov y quality gates


## Riesgos
- Dependencia de servicios externos (SonarQube, Codecov).
- Falsos positivos en métricas → mitigado con thresholds claros en runbook.


Este documento fue movido a `docs/modules/M6.md`.

