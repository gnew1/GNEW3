
# Multi‑Region Object Store & Failover (N169)

> **Objetivo (Prompt N169)**: Puerta de enlace S3‑compatible con **lectura/escritura multi‑región**, **replicación asincrónica**, **failover automático/manual**, **backfill (repair)** y **pre‑firmado** de URLs.  
> **Stack**: Node 20+, TypeScript 5, Express, AWS SDK v3 (@aws-sdk/client-s3), SQLite (WAL), pnpm.

## Capacidades
- **Write‑through** al **activo** y **replicación** al **replica** (best‑effort).
- **Read‑fallback**: al fallar el activo, sirve desde réplica; opcional **repair** (copia de vuelta).
- **Failover** manual (`POST /admin/failover/promote`) o **auto** (si el health del activo falla).
- **Health checks** por región y **estadísticas** básicas.
- **Pre‑firmado** para `GET|PUT` (subidas/descargas directas al bucket) con expiración.
- **Auditoría** encadenada (hash‑chain) y **metadatos** locales (etag, size, contentType, región).

## Endpoints
- `PUT  /objects/:key` — sube (stream) al **activo**; replica a **replica** (lazy).
- `POST /objects` — sube por JSON `{ dataBase64, key?, contentType? }`.
- `GET  /objects/:key` — descarga; fallback a réplica si falla activo. Soporta `?repair=1`.
- `HEAD /objects/:key` — metadatos desde activo (o réplica si `?prefer=replica`).
- `GET  /replication/:key` — estado de réplica para la clave.
- `POST /sign` — `{ op: "get"|"put", key, region?: "primary"|"secondary", contentType?, expiresSec? }` → `{ url }`.
- `GET  /healthz` — salud y región activa.
- `GET  /admin/state` — estado actual (activo, replica).
- `POST /admin/failover/promote` — promover réplica a activa (manual).

## Variables de entorno
```env
PORT=8110
DATABASE_URL=data/multi_region_store.db

# Región primaria
PRIMARY_S3_ENDPOINT=https://s3.amazonaws.com        # o tu MinIO: http://127.0.0.1:9000
PRIMARY_S3_REGION=eu-west-1
PRIMARY_S3_ACCESS_KEY=...
PRIMARY_S3_SECRET_KEY=...
PRIMARY_S3_BUCKET=gnew-primary
PRIMARY_S3_FORCE_PATH_STYLE=0                       # 1 para MinIO

# Región secundaria (opcional pero recomendado)
SECONDARY_S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
SECONDARY_S3_REGION=us-east-1
SECONDARY_S3_ACCESS_KEY=...
SECONDARY_S3_SECRET_KEY=...
SECONDARY_S3_BUCKET=gnew-secondary
SECONDARY_S3_FORCE_PATH_STYLE=0

# Control
ACTIVE_REGION=primary                               # primary|secondary (se puede cambiar vía admin)
FAILOVER_MODE=auto                                  # auto|manual
PRESIGN_EXPIRES=900                                 # segundos (default 900)

Ejecutar
pnpm i
pnpm -C apps/storage/multi-region-object-store build
pnpm -C apps/storage/multi-region-object-store start

# Quick test (PUT/GET)
curl -X PUT --data-binary @README.md \
  -H "Content-Type: text/markdown" \
  http://localhost:8110/objects/docs/readme.md

curl -s http://localhost:8110/objects/docs/readme.md -o out.md

Diseño

S3 Clients por región (acepta AWS o MinIO vía forcePathStyle).

Índice local (objects): etag, size, lastRegion y timestamps.

Replicación: PUT en activo → encola re‑upload a réplica; GET desde réplica con ?repair=1 repara activo.

Health: HEAD del bucket cada 15s (no bloqueante). En auto, cambia a failover si falla 3 veces seguidas.

Limitaciones

No implementa bloqueo distribuido ni versionado S3 (usar buckets con versioning si lo requieres).

La consistencia es eventual; replication/:key ayuda a diagnóstico.


/apps/storage/multi-region-object-store/package.json
```json
{
  "name": "@gnew/multi-region-object-store",
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
    "@aws-sdk/s3-request-presigner": "^3.637.0",
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


