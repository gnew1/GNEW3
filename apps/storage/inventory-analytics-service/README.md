
# S3 Inventory & Cost Analytics + Advisor (N172)

> **Objetivo (Prompt N172)**: Ingerir **S3 Inventory** (CSV/Parquet*), consolidar un **catálogo de objetos** por bucket/prefijo, calcular **coste mensual estimado** por clase de almacenamiento y sugerir un **plan de ahorro** (advisor) compatible con el servicio de **ciclo de vida (N171)**.  
> *En esta entrega soportamos CSV; Parquet queda con hook para agregar rápidamente.*

**Stack**: Node 20+, TypeScript 5, Express, SQLite (WAL), pnpm.

## Capacidades
- **Ingesta** de inventarios S3 (*CSV standard*): `Bucket, Key, Size, StorageClass, LastModifiedDate, ETag, IsLatest, ...`.
- **Catálogo** SQLite por `bucket/key` con *runId* y deduplicación por última versión.
- **Métricas/Coste**: agregados por bucket/prefijo/clase; estimación mensual (USD/TB‑mes).
- **Advisor**: genera **plan** de transición/expiración por reglas simples o por política externa (del servicio N171).
- **Export** de planes a JSON/CSV para orquestación.
- **Auditoría** hash‑encadenada.

## API
- `POST /inventory/upload` — `{ bucket, format: "csv", dataBase64 }` → `{ runId, inserted, updated, skipped }`
- `GET  /inventory/stats?bucket=...&prefix=...` → agregados por clase.
- `GET  /cost/current?bucket=...&prefix=...` → `{ totalUSD, breakdown: { STANDARD: {tb, usd}, ... } }`
- `POST /advisor/plan` — genera plan:
  ```jsonc
  {
    "bucket": "gnew-primary",
    "prefix": "logs/",
    "rules": {
      "minAgeDays": 30,
      "minSize": 10485760,
      "toStorageClass": "STANDARD_IA",
      "expireAfterDays": null
    },
    "limit": 1000,
    "dryRun": true
  }


GET /plans/:planId — detalle + export (añadir ?format=csv).

GET /healthz — salud.

Integración con N171: puedes reutilizar los mismos umbrales. Si ya tienes políticas en el servicio de ciclo de vida, basta con transformar la salida de este advisor al plan esperado por N171.

Variables de entorno
PORT=8113
DATABASE_URL=data/inventory_analytics.db

# Precios (USD / TB*mes)
PRICE_STANDARD=23
PRICE_STANDARD_IA=12.5
PRICE_ONEZONE_IA=10
PRICE_GLACIER_IR=4
PRICE_GLACIER=3.6
PRICE_DEEP_ARCHIVE=1

Uso rápido
pnpm i
pnpm -C apps/storage/inventory-analytics-service build
pnpm -C apps/storage/inventory-analytics-service start

# Cargar un CSV (base64)
curl -s -X POST localhost:8113/inventory/upload -H 'Content-Type: application/json' -d @- <<'JSON'
{
  "bucket": "gnew-primary",
  "format": "csv",
  "dataBase64": "<BASE64_DEL_CSV>"
}
JSON

# Ver coste estimado
curl -s 'http://localhost:8113/cost/current?bucket=gnew-primary&prefix=logs/' | jq

# Generar plan de ahorro (dry-run)
curl -s -X POST localhost:8113/advisor/plan -H 'Content-Type: application/json' -d @- <<'JSON'
{
  "bucket": "gnew-primary",
  "prefix": "logs/",
  "rules": { "minAgeDays": 30, "minSize": 10485760, "toStorageClass": "STANDARD_IA" },
  "limit": 500,
  "dryRun": true
}
JSON

DoD

Ingesta CSV con dedupe por bucket/key y último run.

Cálculo de coste por clase y prefijo.

Advisor produce plan idempotente (marca reason y estSavingsUSD por objeto).

Auditoría encadenada disponible.


/apps/storage/inventory-analytics-service/package.json
```json
{
  "name": "@gnew/inventory-analytics-service",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "node --watch dist/index.js"
  },
  "dependencies": {
    "better-sqlite3": "^9.6.0",
    "csv-parse": "^5.5.6",
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


