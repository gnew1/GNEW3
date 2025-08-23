
# Moderación de Contenido (N164)

> **Objetivo (Prompt 164)**: Servicio de **Trust & Safety** para **clasificar**, **filtrar** y **encolar revisión humana** de contenido UGC (texto + metadatos), con **política configurable** y **auditoría inmutable**.  
> **Stack**: Node 20+, TypeScript 5, Express, SQLite (WAL), pnpm.  
> **Salida**: `{ decision: allow|review|block, categories, scores, reasons, actions }`.  
> **DoD**: Reglas/umbrales versionables, listas (deny/allow) por **término/usuario**, export de casos, **pruebas** básicas de scoring, auditoría **hash‑chain**.

## Capacidades
- **Clasificación** heurística (regex + diccionarios) en categorías: `sexual`, `violence`, `hate`, `harassment`, `self_harm`, `illegal_goods`, `piracy`, `spam`, `scam`, `pii`, `profanity`.
- **Score** por categoría (0..1) + **decisión** `allow|review|block` según política:
  - `block` si alguna categoría ≥ `blockThreshold[cat]`.
  - `review` si alguna categoría ≥ `reviewThreshold[cat]` (y no bloquea).
  - Reglas **hard**: usuarios en `denyUsers` → `block`; `allowUsers` → `allow` (si no hard block).
- **Mascarado** opcional de PII (`/mask`).
- **Cola de revisión** y etiquetas (`/labels`), **appeals**.
- **Listas**: `denyTerms`, `allowTerms`, `denyUsers`, `allowUsers`.
- **Export** CSV/JSON y **webhooks** opcionales.

## Endpoints
- `POST /moderate` — `{ text, lang?, userId?, context? }` → decisión + razones.
- `POST /mask` — enmascara PII sensible en el texto.
- `POST /contents` — alta de contenido (persistido con huella).
- `GET  /contents/:id` — detalle + última moderación.
- `GET  /queue` — contenidos `review` pendientes.
- `POST /labels` — etiquetar `{ contentId, label: 'allowed'|'blocked'|'needs_changes', note? }`.
- `POST /appeals` — apelación `{ contentId, userId, message }`.
- `GET  /policy` / `POST /policy` — ver/actualizar umbrales y hard rules.
- `POST /lists/upsert` — upsert de listas `{ list:'denyTerms|allowTerms|denyUsers|allowUsers', value }`.
- `GET  /export/cases?since=...&until=...&format=csv|json`
- `GET  /audit/:scopeId` — auditoría encadenada.

## Ejecutar
```bash
pnpm i
pnpm -C apps/trust-safety/moderation-service build
pnpm -C apps/trust-safety/moderation-service start
# Salud
curl -s localhost:8096/healthz

Variables

PORT (default 8096)

DATABASE_URL (default data/moderation.db)

WEBHOOK_URL (opcional; notifica decisiones review|block)


/apps/trust-safety/moderation-service/package.json
```json
{
  "name": "@gnew/moderation-service",
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


