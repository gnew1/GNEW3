
# Data Lineage & Impact Analysis (N165)

> **Objetivo (Prompt N165)**: **Trazabilidad de datos** a nivel de **dataset**, **job** y **columna**, con **ingesta de eventos**, **grafo de dependencias** (upstream/downstream), **mappings** columna‑a‑columna, **análisis de impacto** y **export OpenLineage**.  
> **Stack**: Node 20+, TypeScript 5, Express, SQLite (WAL), pnpm.  
> **DoD**: Auditoría inmutable (hash‑chain), consultas de grafo en tiempo real, tests básicos.

## Capacidades
- **Ingesta** de ejecuciones (`jobs`) con datasets **leídos** y **escritos** + **mappings** (derivaciones de columnas).
- **Registro de esquemas** versionados: columnas (`name`, `type`, `nullable`).
- **Grafo**: edges `READ`, `WRITE`, `DERIVE` con navegación **upstream/downstream** por profundidad.
- **Impact Analysis**: efecto de remover/cambiar columna o dataset.
- **Export** (lectura) a formato **OpenLineage** compatible (`/openlineage/events`).
- **CLI opcional**: enviar eventos desde pipelines (no incluido ahora; API lista para integrarse con CI/CD).

## Endpoints
- `POST /events/ingest` — ingesta de ejecución: `{ run, reads[], writes[], mappings[] }`.
- `GET  /datasets` — listar/buscar datasets.
- `GET  /datasets/:id` — detalle + último esquema/versión.
- `GET  /graph?dataset=ns.name&depth=2&direction=both|upstream|downstream&columns=0|1`
- `GET  /impact?dataset=ns.name&column=col&kind=remove|type_change`
- `GET  /jobs/:runId` — info de un job.
- `GET  /openlineage/events?since=YYYY-MM-DD&until=YYYY-MM-DD`
- `GET  /audit/:scopeId` — cadena de auditoría para dataset|run.

## Uso
```bash
pnpm i
pnpm -C apps/data/lineage-service build
pnpm -C apps/data/lineage-service start
curl -s localhost:8097/healthz

Variables

PORT (default 8097)

DATABASE_URL (default data/lineage.db)

Ejemplo rápido

Ver data/examples.http con una ingesta de job ETL bronze→silver y consultas de grafo/impacto.


/apps/data/lineage-service/package.json
```json
{
  "name": "@gnew/lineage-service",
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


