
# Auditoría de Wallets (N160)

> **Prompt 16.10 · Auditoría de wallets**  
> Objetivo: **Seguridad**, **revocación** y **listas bloqueadas** con heurísticas de riesgo y export a **SIEM**.  
> Stack: Node 20+, TypeScript 5, Express, SQLite (WAL), pnpm.  
> Entregables: **panel/servicio auditor**, **procesos de bloqueo/revocación**, **listas (deny/allow/sanctions/revoked)**.  
> DoD: **MTTD bajo** (ingesta y score inmediato), falsos positivos tolerables, **logs append‑only**.

## Capacidades
- **Score de riesgo** por wallet con decisión: `allow | warn | block`.
- Listas: **deny**, **allow**, **sanctions**, **revoked** (revocación de certificados/credenciales de wallet).
- **Heurísticas**: edad de wallet, velocidad de transacciones, contra‑partes de alto riesgo, flags por listas, monto reciente.
- **Ingesta** de eventos (`tx`, `alert`, `label`) y recomputo inmediato.
- **Export SIEM** (JSONL/CSV) de eventos y decisiones.
- **Auditoría inmutable** (hash encadenado).
- **API** para política (umbrales) y gestión de listas/revocaciones.

## Endpoints
- `POST /assess` — Puntuar una wallet `{ address, chainId?, signals? }` → `{ score, decision, reasons }`.
- `GET  /wallets/:address` — Detalle + score + últimos eventos.
- `POST /ingest` — Ingesta de evento `{ address, kind: 'tx'|'alert'|'label', payload }`.
- `POST /lists/upsert` — Upsert en listas `{ list: 'deny'|'allow'|'sanctions', address, note? }`.
- `POST /revocations` — Añadir revocación `{ address, reason, expiresAt? }`.
- `GET  /revocations` — Listado vigente.
- `GET  /policy` / `POST /policy` — Ver/actualizar umbrales.
- `GET  /export/siem?since=YYYY-MM-DD&until=YYYY-MM-DD&format=jsonl|csv` — Export de eventos/decisiones.
- `GET  /audit/:scopeId` — Cadena de auditoría.

## Ejecutar
```bash
pnpm i
pnpm -C apps/security/wallet-auditor build
pnpm -C apps/security/wallet-auditor start
# salud
curl -s localhost:8092/healthz

Modelo de decisión (heurístico)

Score 0..1 (suma ponderada):

+0.50 si deny|sanctions|revoked.

+min(0.30, log(1+txVelocity1h)/5).

+0.10 si edad < 7 días; +0.05 si < 30 días.

+min(0.20, log(1+amountMinorRecent/1e6)/10) — escala por importe.

+0.10 si ≥1 contraparte marcada de alto riesgo.
Política por defecto:

block si score ≥ 0.70

warn si score ≥ 0.30

allow en otro caso

Notas: Señales pueden venir de watchers on‑chain, proveedores de listas (OFAC, mixers) o etiquetas internas. El servicio no llama a terceros: se ingestan por API.


/apps/security/wallet-auditor/package.json
```json
{
  "name": "@gnew/wallet-auditor",
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
    "date-fns": "^3.6.0",
    "express": "^4.19.2",
    "nanoid": "^5.0.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.5.4",
    "jest": "^29.7.0",
    "typescript": "^5.5.4"
  }
}


