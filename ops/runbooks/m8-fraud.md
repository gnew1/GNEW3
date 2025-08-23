
# Runbook M8 - Detección de Fraude On/Off‑Chain

## Objetivos
- Identificar transacciones sospechosas combinando reglas heurísticas y ML.
- Exponer servicio REST para análisis.

## Pasos
1. Ejecutar servicio:
   ```bash
   npm run start:fraud


Enviar transacción ejemplo:

curl -X POST http://localhost:4008/analyze -H "Content-Type: application/json" -d '{"tx": {"hash": "0xabc", "value":"1000000000000000000000","gasLimit":"10000000"}}'


Verificar respuesta con flagged: true.

DoD

Tests unitarios y de integración pasan en CI.

API responde en menos de 500ms por transacción.

Flags reproducibles con reglas definidas.


/README-M8.md
```markdown
# M8: Detección Proactiva de Fraude On/Off‑Chain

## Entregables
- Servicio Express/TS `/services/fraud/m8-fraud-detector.ts`.
- Tests unitarios `/tests/fraud/test_m8_fraud_detector.test.ts`.
- CI workflow `/ops/ci/m8-fraud.yml`.
- Runbook operativo `/ops/runbooks/m8-fraud.md`.

## Commit sugerido


feat(fraud): añadir módulo M8 con detección heurística y stub ML


## Riesgos y mitigaciones
- **Falsos positivos**: ajustar pesos de reglas y ML.
- **Escalabilidad**: implementar colas si volumen alto.
- **ML stub**: sustituir por modelo N124 entrenado.


M_pointer actualizado: M9 ✅

