
# Disputes & Chargebacks Service (N158)

> Prompt N158 — **Disputas & Chargebacks**  
> Objetivo: gestionar **disputas**, **evidencias**, **plazos**, **hold de fondos**, y **chargebacks** con auditoría y scoring de riesgo.  
> Stack: Node 20+, TypeScript 5, Express + SQLite (minor units), pnpm.  
> Entregables: **estado de disputas**, **timeline**, **hold/aplicación de contracargo**, **export** y **webhooks** de resultado.

## Capacidades
- Apertura de disputa contra una **orden externa** (`orderId`) con **importe en minor units**.
- **Plazos** automáticos (ventana de evidencia y de arbitraje) por esquema (`card|bank|wallet`).
- Carga de **evidencias** tipadas (recibos, tracking, KYC, chat, etc.) y **sumario** para envío al adquirente.
- **Hold** de fondos (bloqueo) sobre la porción de partner susceptible a reverso (registro contable interno).
- **Resolución** (`won|lost|partial`) → aplica **chargeback** y genera **ajustes** exportables al módulo de *fees/balances*.
- **Scoring de riesgo** heurístico por razón, cuantía y señal histórica (0–100).
- **Auditoría** apend‑only (hash‑chain) y **export CSV**.

## Endpoints
- `POST /disputes/open` — `{ orderId, partnerId, currency, amount, decimals, reason, scheme }`
- `GET  /disputes/:id` — detalle + timeline + evidencias
- `GET  /disputes` — filtros `state`, `partnerId`, `from`, `to`
- `POST /disputes/:id/evidence` — `{ type, content }`
- `POST /disputes/:id/submit` — cierra ventana de evidencia (marca `submitted`)
- `POST /disputes/:id/resolve` — `{ outcome: "won"|"lost"|"partial", chargebackMinor? }`
- `GET  /exports/adjustments.csv?from=...&to=...` — ajustes contables (para aplicar en balances externos)
- `GET  /audit/:scopeId` — auditoría encadenada
- `POST /webhooks/result` — recepción de resultado externo (firma HMAC opcional)

## Uso
```bash
pnpm i
pnpm -C apps/payments/disputes-chargebacks build
pnpm -C apps/payments/disputes-chargebacks start

Integración contable

Este servicio no toca saldos de terceros; registra holds y ajustes:

holds: bloqueos vivos (p. ej., -1000 minor units).

adjustments: cargos/créditos a aplicar por sistema ledger externo (p. ej., /apps/payments/marketplace-fees).

Exporta CSV de adjustments para conciliación o puedes leerlos por API.

DoD

Flujo completo open → evidence → submit → resolve con plazos.

Hold creado al abrir y liberado/aplicado al resolver.

Chargeback aplicado y ajuste generado con magnitud y signo correctos.

Auditoría inmutable y tests de estados y cálculo de riesgo.


/apps/payments/disputes-chargebacks/package.json
```json
{
  "name": "@gnew/disputes-chargebacks",
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


