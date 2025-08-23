
# Marketplace Fees & Revenue Share (N157)

> Prompt N157 — **Marketplace fees y revenue share**  
> Objetivo: motor de **comisiones de marketplace** con **revenue share** por partner/categoría, **retenciones** y **pagos** programados.  
> Stack: Node 20+, TypeScript 5, Express + SQLite (monedas en **minor units**), pnpm.  
> Entregables: **motor de reglas**, **ledger de splits**, **balances**, **payouts** (CSV/JSON) y **auditoría**.

## Capacidades
- Reglas de **fee**: por **partner**, por **categoría** y globales. Soporta `feePct`, `minFee`, `capFee`.
- Revenue share con **base imponible** = `gross - tax` (evita “fee sobre impuestos”).
- **Retenciones** opcionales sobre la parte del partner (p. ej., IRPF/withholding).
- **Cálculo robusto en minor units** (enteros; sin errores de redondeo).
- **Balances** por partner/moneda y **payouts** (agrupados por período).
- **Auditoría inmutable** (hash‑chain) de eventos de orde n/split/payout.

## Endpoints
- `POST /partners` — alta `{ name, defaultFeePct?, withholdingPct? }`
- `POST /fee-rules` — `{ scope: "global"|"partner"|"category", partnerId?, category?, feePct, minFee, capFee, currency }`
- `POST /orders` — ingesta de venta `{ partnerId, externalId, currency, gross, tax, category }`
- `GET  /orders/:id` — consulta split
- `GET  /balances?partnerId=...` — saldo disponible por moneda
- `POST /payouts/prepare` — `{ partnerId, currency, untilDate }` genera payout pendiente
- `POST /payouts/:id/mark-paid` — marca payout como pagado `{ reference }`
- `GET  /payouts/:id` — detalle y CSV (`Accept: text/csv`)
- `GET  /audit/:scopeId` — auditoría (hash‑chain)

## Ejecución
```bash
pnpm i
pnpm -C apps/payments/marketplace-fees build
pnpm -C apps/payments/marketplace-fees start

Diseño de cálculo (minor units)

grossMinor y taxMinor son enteros (p. ej., EUR con 2 decimales → céntimos).

Base de fee = netMinor = grossMinor - taxMinor.

platformFee = clamp(round(netMinor * feePct), minFee, capFee)

partnerGross = netMinor - platformFee

withholding = round(partnerGross * withholdingPct)

partnerNetPayable = partnerGross - withholding

round(x) es half‑up en minor units.

DoD

Motor de reglas con prioridades (partner→categoría→global).

Ledger de splits y balances consistentes.

Payouts generados por período con CSV de conciliación.

Pruebas de redondeo, mínimos y caps.


/apps/payments/marketplace-fees/package.json
```json
{
  "name": "@gnew/marketplace-fees",
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


