
# Runbook M10 - Plataforma de Analítica Descentralizada y Querying Privado

## Objetivo
- Permitir queries sobre datos on/off-chain.
- Asegurar privacidad mediante generación de pruebas zk (stub).

## Pasos
1. Levantar servicio:
   ```bash
   npm run start:analytics


Ejecutar query:

curl -X POST http://localhost:4010/query -H "Content-Type: application/json" -d '{"dataset":"test","aggregate":"count","field":"value"}'


Ejecutar query privada:

curl -X POST http://localhost:4010/query -H "Content-Type: application/json" -d '{"dataset":"test","aggregate":"sum","field":"value","private":true}'

DoD

API funcional y documentada.

Pruebas unitarias en CI.

Ejecución reproducible de queries.

Pruebas zk-stub funcionando.


/README-M10.md
```markdown
# M10: Plataforma de Analítica Descentralizada y Querying Privado

## Entregables
- Servicio `/services/analytics/m10-query-engine.ts`.
- Tests `/tests/analytics/test_m10_query_engine.test.ts`.
- Workflow CI `/ops/ci/m10-analytics.yml`.
- Runbook `/ops/runbooks/m10-analytics.md`.

## Commit sugerido


feat(analytics): implementar módulo M10 de query engine descentralizado con stub zk


## Riesgos y mitigaciones
- **Datos stub**: aún no conectado a fuentes reales; migrar a substreams.
- **zk-SNARK stub**: reemplazar por librería real en N124.
- **Escalabilidad**: soportar datasets grandes con MPC.


M_pointer actualizado: M11 ✅

