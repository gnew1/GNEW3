
# Versionado Legal de Documentos (N166)

> **Objetivo (Prompt N166)**: Contratos y políticas **versionados** con **hash on‑chain**, **diffs** legibles y **firmas** verificables.  
> **Stack**: Node 20+, TypeScript 5, Express, SQLite (WAL), `ethers` v6, `diff`, pnpm.  
> **Entregables**: **registro on‑chain** (adaptador + contrato opcional), **diffs** y **firmas** (verificación), **prueba de integridad verificable**.

## Capacidades
- Alta de **documentos** y **versiones** con cálculo de **SHA‑256**.
- **Diff** unificado (estilo unified) entre versiones.
- **Firmas** detached (Ed25519 / RSA‑PSS‑SHA256 / ECDSA P‑256 / secp256k1) sobre **contenido** o **hash**.
- **Registro on‑chain** del hash (bytes32) mediante **Ethers** + contrato `DocHashRegistry` (provisto).
- **Verificación** de integridad contra on‑chain.
- **Auditoría** append‑only (hash encadenado).

## Endpoints
- `POST /documents` — `{ title, type, content(base64|text), mime? }` → `{ id, version: 1, sha256Hex }`
- `GET  /documents/:id` — metadatos + versiones (últimas 100).
- `POST /documents/:id/versions` — `{ content(base64|text), mime? }` → nueva versión + hash.
- `GET  /documents/:id/versions/:ver/diff` — diff con la versión previa.
- `POST /documents/:id/versions/:ver/signatures` — adjunta y **verifica** firma.
- `POST /documents/:id/versions/:ver/register` — registra hash on‑chain (si configurado).
- `GET  /verify/:id/:ver` — compara hash local vs on‑chain.
- `GET  /healthz` — salud.

## Configuración
Variables de entorno:
- `PORT` (default `8098`)
- `DATABASE_URL` (default `data/doc_versioning.db`)
- **On‑chain (opcional)**:
  - `CHAIN_RPC_URL` — RPC HTTPS de la red (e.g., Holesky/Amoy)
  - `CHAIN_ID` — id de cadena (e.g., `17000`)
  - `REGISTRY_ADDRESS` — dirección del contrato `DocHashRegistry`
  - `REGISTRY_PRIVATE_KEY` — clave del firmante (solo para `register`)

> Si **no** se definen `CHAIN_RPC_URL` y `REGISTRY_ADDRESS`, el registro on‑chain se omite (modo *dry‑run*), pero el servicio sigue operativo.

## Contrato
Contrato de referencia en `/packages/contracts/DocHashRegistry.sol` (Solidity ^0.8.24).

## Ejecutar
```bash
pnpm i
pnpm -C apps/legal/doc-versioning build
pnpm -C apps/legal/doc-versioning start
# Prueba
curl -s localhost:8098/healthz

DoD

✅ Hash reproducible (SHA‑256) con verificación on‑chain (si configurado).

✅ Diffs y firmas verificadas (ok/ko) por versión.

✅ Auditoría encadenada para operaciones clave.


/apps/legal/doc-versioning/package.json
```json
{
  "name": "@gnew/doc-versioning",
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
    "diff": "^5.2.0",
    "ethers": "^6.13.1",
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


