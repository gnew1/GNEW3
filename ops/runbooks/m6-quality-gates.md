
# Runbook M6 - Quality Gates y Deuda Técnica

## Quality Gates definidos
- **Cobertura mínima**: 85% líneas.
- **Lint**: sin errores bloqueantes.
- **Build**: obligatorio passing en CI.
- **SonarQube**: sin `Blocker` ni `Critical`.

## Pasos de DoD
1. Ejecutar `npm run lint && npm test`.
2. Confirmar cobertura >85%.
3. Revisar reporte SonarQube → sin vulnerabilidades críticas.
4. Confirmar envío de cobertura a Codecov.
5. Validar métricas DORA (`npm run dora:metrics`).

## Ejemplo de uso
```bash
npm run dora:metrics


Salida esperada:

Deployment Frequency: 3/día
Lead Time: 12h
Change Failure Rate: 5%
MTTR: 15m


/package.json (extracto scripts)
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts",
    "test": "jest",
    "dora:metrics": "ts-node ops/metrics/m6-dora-metrics.ts"
  }
}


