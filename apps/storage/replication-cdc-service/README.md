
# CDC de Replicación & Replayer (N170)

> **Objetivo (Prompt N170)**: Servicio de **Change Data Capture (CDC)** para **replicación multi‑región** de objetos, con **log de eventos**, **replayer** (copia desde región origen → región destino), **backfill**, **DLQ** y **métricas**.  
> **Stack**: Node 20+, TypeScript 5, Express, SQLite (WAL), AWS SDK v3 (S3), pnpm.

## Casos de uso
- **Replicar** `PUT`/`DELETE` desde la **primaria** hacia **secundaria** de forma confiable (idempotente).
- **Reparar/backfill** a partir de listados o claves manuales.
- **DLQ**: reencolar errores tras correcciones de permisos/config.
- Integración opcional con **N169 Multi‑Region Object Store** (emitir `POST /events/ingest` al confirmar `PUT`).

## Endpoints
- `POST /events/ingest` — ingesta de 1..N eventos CDC.
  ```jsonc
  {
    "events": [
      { "op": "PUT", "key": "path/file.bin", "etag": "abc", "size": 123, "contentType": "application/octet-stream",
        "srcRegion": "primary", "dstRegion": "secondary", "ts": 1724130000000 }
    ]
  }


POST /replay/run — ejecuta replayer sobre pendientes: { limit?: 50, leaseSec?: 60, maxRetries?: 5 }.

POST /events/requeue — { ids?: [..], allErrors?: true } reencola.

POST /backfill/keys — agenda claves para re‑copiar { keys: ["a","b"], srcRegion, dstRegion }.

GET /events — lista con filtros status, keyLike, limit, offset.

GET /metrics — contadores por estado y lag.

GET /healthz — salud.

Variables de entorno
PORT=8111
DATABASE_URL=data/replication_cdc.db

# S3 Origen/Destino (coinciden con N169 si deseas)
PRIMARY_S3_ENDPOINT=https://s3.amazonaws.com
PRIMARY_S3_REGION=eu-west-1
PRIMARY_S3_ACCESS_KEY=...
PRIMARY_S3_SECRET_KEY=...
PRIMARY_S3_BUCKET=gnew-primary
PRIMARY_S3_FORCE_PATH_STYLE=0

SECONDARY_S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
SECONDARY_S3_REGION=us-east-1
SECONDARY_S3_ACCESS_KEY=...
SECONDARY_S3_SECRET_KEY=...
SECONDARY_S3_BUCKET=gnew-secondary
SECONDARY_S3_FORCE_PATH_STYLE=0

Ejecutar
pnpm i
pnpm -C apps/storage/replication-cdc-service build
pnpm -C apps/storage/replication-cdc-service start

# Ingestar un evento y re‑ejecutar
curl -s -X POST localhost:8111/events/ingest -H 'Content-Type: application/json' -d \
'{"events":[{"op":"PUT","key":"demo/hello.txt","etag":"demoe","size":11,"contentType":"text/plain",
"srcRegion":"primary","dstRegion":"secondary","ts":'$(date +%s000)'}]}'

curl -s -X POST localhost:8111/replay/run -H 'Content-Type: application/json' -d '{"limit":10}'

Diseño

Tabla events: única por (key, op, etag, srcRegion, dstRegion) para idempotencia.

Leasing: status=in_progress + leaseUntil para evitar trabajos zombies.

Replayer: GET Object (src) → PUT Object (dst) (streaming), valida ETag.

DLQ: status=error con attempts, lastError. Reencola vía POST /events/requeue.

Backfill: crea eventos PUT sin etag (best‑effort: HEAD en origen para etag/size).

Integración con N169

Tras un PUT exitoso en N169, emitir CDC:

curl -s -X POST http://localhost:8111/events/ingest -H 'Content-Type: application/json' -d '{
  "events":[{"op":"PUT","key":"docs/readme.md","etag":"<etag>","size":123,"contentType":"text/markdown",
             "srcRegion":"primary","dstRegion":"secondary","ts": 1724130000000}]
}'


/apps/storage/replication-cdc-service/package.json
```json
{
  "name": "@gnew/replication-cdc-service",
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


