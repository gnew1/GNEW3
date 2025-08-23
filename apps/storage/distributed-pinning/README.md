
# Distributed Pinning & Persistence (N161)

> **Prompt 16.11 · Pinning y persistencia distribuida (IPFS/Filecoin/Arweave)**  
> Objetivo: **almacenamiento inmutable** con **replicación K‑of‑N** sobre **IPFS**, **Filecoin (web3.storage)** y **Arweave (Bundlr)**.  
> Stack: Node 20+, TypeScript 5, Express, SQLite (WAL), pnpm, `fetch` nativo.

## Capacidades
- **Ingesta** de objetos (`POST /objects`) en JSON (`base64`) o `multipart/form-data`.
- Cálculo de **SHA‑256** y **CID** (vía IPFS o web3.storage) y **replicación K‑of‑N** (configurable).
- **Drivers**:
  - `ipfs`: HTTP API (`/api/v0`) local/remota (pin + status).
  - `web3storage`: Upload a **Filecoin** (persistencia con pin automático).
  - `bundlr`: Upload a **Arweave** vía Bundlr (firma por clave privada).
- **Estado** y **verificación** multi‑backend (`/status/:cid`, `/verify/:cid`).
- **Gateways** unificados (`/gateways/:cid`) para IPFS y Arweave.
- **Auditoría** append‑only (hash encadenado).
- **Política K‑of‑N** (`REPLICATION_THRESHOLD`) con reintentos y colas ligeras.

## Endpoints
- `POST /objects` — ingesta y replicación; respuesta `{ cid, sha256, size, backends }`.
- `POST /pin/:cid` — re‑replicación de un CID existente.
- `GET  /status/:cid` — estado por backend.
- `GET  /gateways/:cid` — URLs de descarga/gateways.
- `GET  /verify/:cid` — verifica disponibilidad y hash (mejor‑esfuerzo).
- `GET  /audit/:cid` — cadena de auditoría para el CID.
- `GET  /healthz` — salud del servicio.

## Variables de entorno
- `PORT` (default `8094`)
- `DATABASE_URL` (default `data/distributed_pinning.db`)
- `REPLICATION_THRESHOLD` (default `2`) → K de N.
- **IPFS**: `IPFS_API_URL` (p. ej., `http://127.0.0.1:5001/api/v0`)
- **web3.storage**: `WEB3_STORAGE_TOKEN` (Bearer)
- **Bundlr/Arweave**:
  - `BUNDLR_URL` (p. ej., `https://node1.bundlr.network`)
  - `BUNDLR_CURRENCY` (`arweave`, `matic`, etc.)
  - `BUNDLR_PRIVATE_KEY` (clave privada en PEM/JWK según moneda)

> **Nota**: Si un backend no está configurado, se ignora en N. El servicio eligirá un **primario** (IPFS si existe, si no web3.storage) para obtener el CID durante la ingesta.

## Ejecución
```bash
pnpm i
pnpm -C apps/storage/distributed-pinning build
pnpm -C apps/storage/distributed-pinning start
# Prueba rápida
curl -s localhost:8094/healthz

DoD

✅ Ingesta y cálculo de CID con replicación K‑of‑N.

✅ Estado por backend y verificación (gateway + hash).

✅ Auditoría inmutable y persistencia en SQLite.

✅ Gateways IPFS/Arweave listos para UI o descargas.


/apps/storage/distributed-pinning/package.json
```json
{
  "name": "@gnew/distributed-pinning",
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
    "typescript": "^5.5.4"
  }
}


