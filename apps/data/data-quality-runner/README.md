
# Data Quality Rules & Expectations Runner (N174)

> **Prompt N174** — Motor de **reglas de calidad de datos** con *expectations* declarativas, integrado al **Catálogo (N173)** y a almacenamiento S3‑compatible.  
> **Stack**: Node 20+, TypeScript 5, Express, SQLite (WAL), AWS SDK v3 (S3), pnpm.  
> **Monorepo**: `apps/data/data-quality-runner`.

## ¿Qué entrega?
- **Reglas** por `db.table` (del catálogo) o por `location` (S3/prefijo):
  - `freshness`: máximo `LastModified` dentro de un umbral.
  - `min_files`: al menos *N* objetos bajo el prefijo.
  - `min_total_size`: bytes mínimos bajo el prefijo.
  - `file_format`: que el formato esperado coincida (según catálogo).
  - `schema_match`: columnas esperadas ⊆ columnas en catálogo.
  - `partition_presence`: existen particiones recientes (día actual/ayer o patrón cron).
- **Runner**: ejecuta reglas on‑demand o por selección (`db`, `table`), guarda **runs** y **resultados** (`pass|warn|fail`) con detalle.
- **Integración Catálogo (N173)**: lee tablas, columnas, formato y ubicación desde `data/data_catalog.db` (configurable).
- **S3 Probe**: lista objetos bajo `s3://bucket/prefix` y computa *count/bytes/maxLastModified*.
- **Métricas** y **reportes** consolidados por tabla/regla.

## API
- `POST /rules/upsert` — crear/actualizar regla.
- `GET  /rules?db=&table=` — listar reglas.
- `DELETE /rules/:id` — eliminar regla.
- `POST /run/execute` — ejecutar:  
  ```jsonc
  { "ruleId": "<id>" }                       // o
  { "db": "demo", "table": "events" }        // ejecuta todas las reglas de esa tabla


GET /runs/:runId — resultados del run.

GET /reports/latest?db=demo&table=events — último reporte consolidado por tabla.

GET /metrics — conteos por estado/severidad.

GET /healthz

Variables de entorno
PORT=8115
DATABASE_URL=data/data_quality.db

# Catálogo (N173)
CATALOG_DB_URL=data/data_catalog.db

# S3 (para probe de ubicaciones)
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=eu-west-1
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_FORCE_PATH_STYLE=0

Ejemplos rápidos
pnpm i
pnpm -C apps/data/data-quality-runner build
pnpm -C apps/data/data-quality-runner start

# Añadir regla de frescura para demo.events (debe actualizarse cada 120 min)
curl -s -X POST localhost:8115/rules/upsert -H 'Content-Type: application/json' -d '{
  "name":"freshness-2h","db":"demo","table":"events",
  "kind":"freshness","severity":"high","params":{"maxDelayMinutes":120}
}'

# Ejecutar todas las reglas de demo.events
curl -s -X POST localhost:8115/run/execute -H 'Content-Type: application/json' -d '{"db":"demo","table":"events"}' | jq

# Último reporte consolidado
curl -s 'http://localhost:8115/reports/latest?db=demo&table=events' | jq

DoD

Reglas persistidas y idempotentes.

Runner calcula métricas S3 y cruza con catálogo.

Resultados con status, detail y trazabilidad (runId, startedAt/finishedAt).


/apps/data/data-quality-runner/package.json
```json
{
  "name": "@gnew/data-quality-runner",
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
    "@aws-sdk/client-s3": "^3.637.0",
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


