
# Edge Control Plane (N164)

> Orquestador para **CDN Gateway & Edge Compute (N163)**: firma de URLs, rotación de claves HMAC, **purges por tag** y auditoría encadenada.

## Objetivos
- Emitir **signed URLs** compatibles con el verificador del worker (`METHOD|PATH?QUERY_SIN_SIG|exp` + HMAC‑SHA256 base64url).
- **Gestión de claves** (`kid`) con expiración y rotación (mantiene histórico).
- **Purge por tag** contra el worker (`/edge/purge?tag=...`) usando `ADMIN_TOKEN`.
- **Auditoría** append‑only (hash‑chain).
- Endpoints seguros mediante **API keys** con roles.

## Stack
Node 20+, TypeScript 5, Express, SQLite (WAL), pnpm.

## Endpoints
- `GET  /healthz`
- `GET  /keys` — lista metadatos de claves activas/inactivas (no revela el secreto).
- `POST /keys` — crea clave `{ kid?, expiresAt? }`.
- `POST /keys/:kid/rotate` — rota secreto, mantiene la misma `kid` (versionado interno).
- `POST /sign` — firma una o varias URLs.
  ```jsonc
  // request
  {
    "items": [
      { "url": "https://cdn.example/edge/proxy/assets/app.css?tag=ui", "kid": "kid1", "exp": 1750000000, "method": "GET" }
    ]
  }
  // response
  { "items": [ { "inputUrl": "...", "signedUrl": "...&key=kid1&exp=1750000000&sig=..." } ] }


POST /purge — { tag: "ui" } → proxy al worker /edge/purge?tag=ui con x-admin-token.

GET /audit/:scopeId — cadena de auditoría.

Config

Variables de entorno:

PORT (por defecto 8096)

DATABASE_URL (por defecto data/edge_control_plane.db)

CP_API_KEY — API key para autenticar llamadas (en header x-api-key)

EDGE_BASE_URL — base del worker (p. ej. https://gnew-cdn-gateway.my.workers.dev)

EDGE_ADMIN_TOKEN — token que el worker espera en x-admin-token

Ejecutar
pnpm i
pnpm -C apps/edge/control-plane build
pnpm -C apps/edge/control-plane start

Notas

La firma generada es compatible con el verificador del worker de N163.

Rotación: al rotar, la kid conserva identidad y se incrementa version, manteniendo verificación de URLs ya emitidas durante el período de gracia si ambas versiones están activas.


/apps/edge/control-plane/package.json
```json
{
  "name": "@gnew/edge-control-plane",
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


