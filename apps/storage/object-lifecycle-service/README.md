
# Object Lifecycle, Retention & Legal Hold (N171)

> **Objetivo (Prompt N171)**: Servicio para **retención WORM (governance/compliance)**, **legal holds**, políticas por **bucket/prefijo**, **pre‑flight enforcement** para `PUT/DELETE` y (opcional) **aplicación S3 Object Lock**.  
> **Stack**: Node 20+, TypeScript 5, Express, SQLite (WAL), AWS SDK v3 (S3), pnpm.

## Capacidades
- **Políticas** por `bucket`/`prefix`: `minRetentionDays`, `mode: governance|compliance`, `preventOverwrite`.
- **Legal Holds** por objeto (`key`) con motivo y trazabilidad.
- **Preflight**: decide `allow|deny` para `PUT|DELETE` usando `HEAD` S3 + políticas.
- **Aplicación S3 Object Lock**: `PutObjectRetention` / `PutObjectLegalHold` donde esté habilitado.
- **Auditoría** append‑only encadenada (hash‑chain).
- **Integración** opcional con **N169 Multi‑Region Object Store**: usar como **webhook** de pre‑chequeo.

## Endpoints
- `POST /policies/upsert` — crea/actualiza política.
- `GET  /policies` — lista políticas.
- `POST /holds` — crea legal hold `{ bucket, key, reason }`.
- `DELETE /holds` — elimina legal hold `{ bucket, key }`.
- `GET  /holds/:bucket/:key` — estado de hold.
- `POST /enforce/preflight` — decide `allow|deny`:
  ```jsonc
  { "op": "PUT"|"DELETE", "bucket": "gnew-primary", "key": "path/file.bin" }


POST /s3/apply — aplica retención/hold a un objeto (si el bucket soporta Object Lock).

GET /healthz — salud.

Variables de entorno
PORT=8112
DATABASE_URL=data/object_lifecycle.db

S3_ENDPOINT=https://s3.amazonaws.com      # o MinIO
S3_REGION=eu-west-1
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_FORCE_PATH_STYLE=0                      # 1 para MinIO
DEFAULT_BUCKET=gnew-primary                # opcional, para llamadas que no pasen bucket explícito

Uso rápido
pnpm i
pnpm -C apps/storage/object-lifecycle-service build
pnpm -C apps/storage/object-lifecycle-service start

# Crear política para prefijo con 30 días de retención (governance) y sin overwrite
curl -s -X POST localhost:8112/policies/upsert -H 'Content-Type: application/json' -d '{
  "bucket":"gnew-primary","prefix":"logs/","minRetentionDays":30,"mode":"governance","preventOverwrite":true
}'

# Colocar legal hold a un objeto
curl -s -X POST localhost:8112/holds -H 'Content-Type: application/json' -d '{
  "bucket":"gnew-primary","key":"logs/2025-08-20/a.gz","reason":"investigación"
}'

# Preflight de DELETE (debería denegar si aún no expiró o hay hold)
curl -s -X POST localhost:8112/enforce/preflight -H 'Content-Type: application/json' -d '{
  "op":"DELETE","bucket":"gnew-primary","key":"logs/2025-08-20/a.gz"
}' | jq

Diseño

Evaluación:

Si hay legal hold activo ⇒ deny.

Si existe política aplicable (bucket/prefix) ⇒ calcular retainUntil = lastModified + minRetentionDays.

DELETE: denegar si now < retainUntil.

PUT (overwrite): denegar si preventOverwrite=true y now < retainUntil.

S3: para cálculo se usa HEAD Object (obtiene LastModified, ObjectLockMode, ObjectLockRetainUntilDate, ObjectLockLegalHoldStatus).

Integración con N169

Invocar preflight antes de PUT/DELETE; si deny, abortar operación.

Tras PUT exitoso, puedes llamar a /s3/apply para persistir retención/hold en el bucket (si Object Lock activo).

DoD

Políticas y holds persistidos; preflight fiable, auditoría encadenada y endpoints idempotentes.


/apps/storage/object-lifecycle-service/package.json
```json
{
  "name": "@gnew/object-lifecycle-service",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "node --watch dist/index.js"
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


