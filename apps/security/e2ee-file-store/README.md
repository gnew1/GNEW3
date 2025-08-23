
# Almacenamiento E2E de Archivos con Envelopes & ABAC (N167)

> **Prompt N167** — **Cifrado extremo a extremo** con **envelope encryption** (DEK envuelto por KEK de KMS), **ABAC** (Attribute‑Based Access Control), **rotación/rewrap** y **tokens firmados** para acceso temporal.  
> Stack: Node 20+, TypeScript 5, Express, SQLite (WAL), pnpm.

## Capacidades
- **Cifrado** AES‑256‑GCM por archivo (DEK aleatoria) y **envelope** (`wrappedDEK`) con **KMS local** (RSA‑OAEP‑SHA256). Adaptadores stubs para AWS KMS / Vault Transit.
- **ABAC**: políticas por recurso (dataset/archivo) con evaluación por atributos `{ user, resource, env }`.
- **Tokens de acceso** firmados (HMAC‑SHA256) con expiración (`Bearer`).
- **Rotación de KEK** y **rewrap** de objetos existentes.
- **Auditoría** hash‑encadenada.
- Almacenamiento de blobs en disco (`data/blobs/<objectId>.bin`).

## Endpoints
- `POST /objects` — sube y cifra (multipart o JSON base64):
  - `multipart/form-data`: campo `file`, `ownerId`, `policyId?`, `labels?` (JSON).
  - JSON: `{ dataBase64, ownerId, policyId?, labels? }`
- `GET  /objects/:id` — metadatos del objeto.
- `GET  /objects/:id/content` — descarga (descifra). Requiere **token** `Authorization: Bearer` o `attributes` en query (`userId`, `roles`, etc.).
- `POST /policies` — upsert política ABAC `{ id?, name, rules: [ ... ] }`.
- `GET  /policies/:id` — obtener política.
- `POST /tokens` — mint token `{ objectId, sub, ttlSec }` → `{ token, exp }`.
- `POST /keys/rotate` — rota KEK del KMS local → nueva versión activa.
- `POST /objects/:id/rewrap` — re‑envuelve `wrappedDEK` al KEK activo.
- `GET  /healthz`, `GET /audit/:scopeId`.

## Env
- `PORT` (por defecto `8099`)
- `DATABASE_URL` (por defecto `data/e2ee_store.db`)
- `ACCESS_TOKEN_SECRET` (HMAC para tokens; aleatoria si no se define)
- **KMS Local** (por defecto activo, sin más config):
  - (opcional) `LOCAL_KMS_KEY_PASS` — passphrase para cifrar PEM privada en reposo (simple XOR demo).
- (stubs) `AWS_KMS_KEY_ID`, `AWS_REGION`, `VAULT_ADDR` (si no están, se ignoran)

## Uso
```bash
pnpm i
pnpm -C apps/security/e2ee-file-store build
pnpm -C apps/security/e2ee-file-store start

# Subir (multipart)
curl -F file=@README.md -F ownerId=u1 -F policyId=pol_public http://localhost:8099/objects

# Crear token y descargar
curl -s -X POST localhost:8099/tokens -H 'Content-Type: application/json' \
  -d '{"objectId":"<id>","sub":"u1","ttlSec":600}' | jq -r .token | \
  xargs -I {} curl -H "Authorization: Bearer {}" -L http://localhost:8099/objects/<id>/content -o out.bin

Política ABAC (ejemplo)
{
  "id": "pol_public",
  "name": "Descarga pública con token o rol=admin",
  "rules": [
    { "effect": "allow", "when": { "any": [
      { "equals": ["user.id","resource.ownerId"] },
      { "in": ["user.roles","admin"] },
      { "present": "env.token" }
    ] } }
  ]
}

DoD

Envelopes (DEK) + KEK rotables, rewrap soportado.

ABAC evaluable por atributos estándar, tokens firmados.

Auditoría append‑only encadenada.


/apps/security/e2ee-file-store/package.json
```json
{
  "name": "@gnew/e2ee-file-store",
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
    "busboy": "^1.6.0",
    "express": "^4.19.2",
    "nanoid": "^5.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/busboy": "^1.5.4",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.5.4",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.4",
    "typescript": "^5.5.4"
  }
}


