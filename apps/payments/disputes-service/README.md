
# Disputes & Chargebacks Service (N158)

> **Objetivo**: gestionar **disputas/chargebacks** end‑to‑end: alta, evidencias, representaciones, plazos (SLA), **holds** y **ajustes** de balances (clawbacks) exportables.  
> **Stack**: Node 20+, TypeScript 5, Express, SQLite (minor units), pnpm.  
> **DoD**: 
> - Estados y transiciones auditadas. 
> - Plazos programables con *scheduler* y **autocierre** por expiración. 
> - **Hold** automático en apertura y **liberación/clawback** según resultado. 
> - Export CSV de ajustes.

## Conceptos clave
- **Minor units** (enteros) para importes: `amountMinor` (p. ej. EUR→céntimos).
- **Estados**: `inquiry → chargeback → representment → prearbitration → arbitration → won|lost` (+ `accepted` si el comerciante acepta).  
- **Plazos (SLA)** por estado, parametrizables en días naturales.
- **Hold**: reserva de `amountMinor` (y **feeMinor** opcional) mientras dura la disputa.
- **Ajustes**: al cerrar *won* se libera el hold; al cerrar *lost|accepted* se genera un **clawback**.

## Endpoints
- `POST /disputes/open` — alta de disputa.
- `GET  /disputes/:id` — detalle.
- `GET  /disputes` — listar/filtrar por `status`, `partnerId`, `paymentId`.
- `POST /disputes/:id/evidence` — adjuntar evidencias (metadatos/URLs).
- `POST /disputes/:id/represent` — enviar **representación** (pasa a `representment`).
- `POST /disputes/:id/accept` — aceptar la disputa (pasa a `accepted`).
- `POST /disputes/:id/advance` — transición admin (`prearbitration`/`arbitration`).
- `POST /disputes/:id/close` — cierre forzado `won|lost`.
- `GET  /holds` — holds actuales por `partnerId`.
- `GET  /adjustments/export?since=YYYY-MM-DD&until=YYYY-MM-DD&format=csv|json` — export de **clawbacks/liberaciones**.

## Ejecución
```bash
pnpm i
pnpm -C apps/payments/disputes-service build
pnpm -C apps/payments/disputes-service start

# Scheduler (expiraciones y notificaciones)
pnpm -C apps/payments/disputes-scheduler build
pnpm -C apps/payments/disputes-scheduler start

Config

PORT (por defecto 8085)

DATABASE_URL (por defecto data/disputes.db)

SLA_INQUIRY_DAYS (default 10)

SLA_CHARGEBACK_DAYS (default 7)

SLA_REPRESENTMENT_DAYS (default 10)

SLA_PREARB_DAYS (default 7)

SLA_ARBITRATION_DAYS (default 30)

WEBHOOK_URL (opcional; notificaciones de cambios)

Integración sugerida con @gnew/marketplace-fees: consumir GET /adjustments/export y aplicar los clawbacks sobre balances.


/apps/payments/disputes-service/package.json
```json
{
  "name": "@gnew/disputes-service",
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
    "ts-jest": "^29.2.4",
    "typescript": "^5.5.4"
  }
}


