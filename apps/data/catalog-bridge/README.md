
# Data Catalog Bridge: Glue ↔ Hive Metastore (N173)

> **Prompt N173** — Catálogo de datos unificado con **sincronización desde AWS Glue** y **puente Hive Metastore** (vía import JSON), **API de consulta/búsqueda**, y **vista de particiones**.  
> **Stack**: Node 20+, TypeScript 5, Express, SQLite (WAL), AWS SDK v3 (Glue), pnpm.

## ¿Qué entrega?
- **Sync desde Glue** (`/sync/glue`): bases, tablas, columnas, particiones, ubicación (S3), formato/serde y propiedades.
- **Puente Hive**:
  - Opción rápida: **import JSON** con el esquema del metastore (`/sync/import`).
  - (Hook listo para futuro con Thrift HMS).
- **API del Catálogo**:
  - `GET /catalog/databases`
  - `GET /catalog/tables?db=...&q=...`
  - `GET /catalog/tables/:db/:table`
  - `GET /catalog/columns?db=...&table=...`
  - `GET /catalog/partitions?db=...&table=...&limit=...`
  - `GET /search?q=...` (nombre, descripción, columnas, ubicación)
- **Auditoría** de sync (runs) y **fuente** (glue|hive|import) por entidad.

> Sencillo de integrar con **N171 Lifecycle** y **Inventory Analytics (N172)** vía `location` (S3).

## Variables de entorno
```env
PORT=8114
DATABASE_URL=data/data_catalog.db

# Conector Glue
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Opcional: prefijo para limitar sync
GLUE_CATALOG_PREFIX=                             # ej: "analytics_" filtra bases analytics_*

Uso
pnpm i
pnpm -C apps/data/catalog-bridge build
pnpm -C apps/data/catalog-bridge start

# Sincronizar todo el catálogo Glue
curl -s -X POST localhost:8114/sync/glue -H 'Content-Type: application/json' -d '{}'

# Importar Hive Metastore desde JSON (exportado externamente)
curl -s -X POST localhost:8114/sync/import -H 'Content-Type: application/json' -d @hive_export.json

# Explorar
curl -s 'http://localhost:8114/catalog/databases' | jq
curl -s 'http://localhost:8114/catalog/tables?db=demo' | jq
curl -s 'http://localhost:8114/catalog/tables/demo/events' | jq
curl -s 'http://localhost:8114/search?q=orders' | jq

Formato JSON de import (Hive)
{
  "databases": [
    { "name": "default", "description": "", "locationUri": "hdfs://...", "parameters": {} }
  ],
  "tables": [
    {
      "db": "default",
      "name": "events",
      "description": "eventos",
      "location": "s3://datalake/default/events/",
      "format": "parquet",
      "serde": "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe",
      "inputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
      "outputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
      "parameters": { "EXTERNAL": "TRUE" },
      "partitionKeys": ["dt"],
      "columns": [
        { "name": "id", "type": "string", "comment": "" },
        { "name": "payload", "type": "string", "comment": "" }
      ],
      "partitions": [
        { "values": { "dt": "2025-08-20" }, "location": "s3://.../dt=2025-08-20/", "parameters": {} }
      ]
    }
  ]
}

DoD

Sincroniza Glue con paginación, guarda bases/tablas/columnas/particiones.

Importa Hive desde JSON con idempotencia (upsert).

API de lectura con filtros y búsqueda básica.

Persistencia de fuente y run para trazabilidad.


/apps/data/catalog-bridge/package.json
```json
{
  "name": "@gnew/data-catalog-bridge",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "node --watch dist/index.js"
  },
  "dependencies": {
    "@aws-sdk/client-glue": "^3.637.0",
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


