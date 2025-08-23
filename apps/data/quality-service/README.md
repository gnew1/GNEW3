
# Data Quality & Expectations (N166)

> **Objetivo (Prompt N166)**: Servicio de **calidad de datos** con **expectations/reglas** (tipo *Great Expectations*), **validación por perfil** (métricas agregadas por columna), **detección de anomalías** temporal y **export** de resultados para orquestadores/lineage.  
> **Stack**: Node 20+, TypeScript 5, Express, SQLite (WAL), pnpm.  
> **Salida**: `run` de validación con `status: passed|warn|failed`, `score` 0..1 y lista de **checks**.

## Capacidades
- **Rules engine**: `not_null`, `unique`, `min_value`, `max_value`, `between`, `regex`, `allowed_set`, `max_null_ratio`, `min_distinct`, `max_distinct`, `foreign_key(dataset.col)`.
- **Validación** vía **perfil** (`rowCount`, métricas por columna) enviado por el pipeline (no sube datos crudos).
- **Detección de anomalías** (z-score y EWM) sobre **series temporales** (`rowCount`, `null_ratio`, `distinct_ratio`, etc.).
- **Ejecuciones** versionadas por `runId` (compatibles con N165 lineage).
- **Export** JSON/CSV, **webhooks** opcionales y **auditoría** hash‑chain.

## Endpoints
- `POST /rules/upsert` — crear/actualizar regla de dataset (ver tipos y `params`).
- `GET  /rules?dataset=ns.name` — listar reglas activas.
- `POST /validate` — `{ runId, datasetKey, profile, at?, context? }` → resultado; opcional `linkRun` para enlazar con lineage.
- `GET  /runs/:runId` — detalle; `GET /status?dataset=...` — último estado.
- `POST /metrics/ingest` — ingesta de series `{ datasetKey, points: [{ metric, ts, value }] }`.
- `GET  /metrics/anomalies?dataset=...&metric=rowCount` — detectar anomalías recientes.
- `GET  /export/runs?since=YYYY-MM-DD&until=YYYY-MM-DD&format=json|csv`
- `GET  /audit/:scopeId` — auditoría encadenada.

## Perfil esperado
```jsonc
{
  "rowCount": 12345,
  "columns": [
    {
      "name": "order_id",
      "nulls": 0,
      "distinct": 12345,
      "min": null,
      "max": null,
      "mean": null,
      "stddev": null,
      "hist": null // opcional
    },
    {
      "name": "amount",
      "nulls": 3,
      "distinct": 12000,
      "min": 0,
      "max": 999999,
      "mean": 250.1,
      "stddev": 15.7
    }
  ]
}

Ejecución
pnpm i
pnpm -C apps/data/quality-service build
pnpm -C apps/data/quality-service start
# prueba
curl -s localhost:8098/healthz

DoD

Reglas/expectations ejecutadas sobre perfiles con severidad warn|error.

Anomalías temporal por métrica con umbrales estándar y EWM.

Auditoría hash‑encadenada y export de runs.


/apps/data/quality-service/package.json
```json
{
  "name": "@gnew/quality-service",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand"
  },
  "dependencies": {
    "better-sqlite3": "^9.6.0",
    "express": "^4.19.2",
    "nanoid": "^5.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.5.4",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.4",
    "typescript": "^5.5.4"
  }
}


