
# Lineage Tracker (N175)

> **Prompt N175** — Servicio de **Data Lineage**: registra y expone la trazabilidad de datasets (fuente → destino) incluyendo jobs, reglas aplicadas y calidad.  
> **Stack**: Node.js 20+, TypeScript 5, Express, SQLite (WAL), pnpm.  
> **Monorepo**: `apps/data/lineage-tracker`.

## ¿Qué entrega?
- **Entidades principales**:
  - `datasets`: identificados por `db.table` o `location` (S3/HDFS).
  - `jobs`: procesos ETL/ELT/ML que leen datasets y escriben otros.
  - `lineage_edges`: arcos directed `source → target` + jobId + transform description.
  - `quality_refs`: vinculación con reglas/ejecuciones de **data-quality-runner (N174)**.
- **APIs**:
  - Registrar datasets, jobs y edges.
  - Consultar lineage hacia arriba (upstream) o abajo (downstream).
  - Obtener histórico de jobs para un dataset.
  - Adjuntar resultados de calidad a datasets.

## API
- `POST /datasets` — registrar dataset.
- `GET /datasets/:id` — info dataset + edges.
- `POST /jobs` — registrar job y edges.
- `GET /lineage/upstream?datasetId=...` — todos los antecesores.
- `GET /lineage/downstream?datasetId=...` — todos los descendientes.
- `GET /history?datasetId=...` — jobs ejecutados que lo afectaron.
- `POST /quality/attach` — vincular resultados de calidad (`ruleId`, `runId`) a dataset.
- `GET /quality/:datasetId` — ver métricas de calidad asociadas.

## Variables de entorno
```env
PORT=8116
DATABASE_URL=data/lineage.db

DoD

Consultas recursivas con CTE para lineage.

Jobs y edges persistidos con timestamps.

Vinculación con reglas de N174.

Exposición de lineage navegable.


/apps/data/lineage-tracker/package.json
```json
{
  "name": "@gnew/lineage-tracker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "node --watch dist/index.js",
    "test": "node --test"
  },
  "dependencies": {
    "better-sqlite3": "^9.6.0",
    "express": "^4.19.2",
    "nanoid": "^5.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.5.4",
    "typescript": "^5.5.4"
  }
}


