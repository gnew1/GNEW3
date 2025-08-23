
# Fiat On/Off‑Ramp Aggregator (N153)

Servicio **no custodial** para integrar rampas **fiat → cripto** (on‑ramp) y **cripto → fiat** (off‑ramp) con múltiples proveedores.  
Expone cotizaciones agregadas, creación de órdenes, seguimiento de estado, KYC/AML básico y webhooks verificados.

> Stack: Node 20+, TypeScript 5, Express, SQLite embebido, pnpm.

## Capacidades
- **Quotes agregadas** por proveedor con comisiones y tiempo estimado.
- **Creación de órdenes** on/off‑ramp con *idempotency key*.
- **KYC lightweight** (estados `pending|approved|rejected|expired`) y *evidence*.
- **Webhooks** con firma HMAC por proveedor (rotación de secretos).
- **Auditoría inmutable** (hash‑chain) por wallet u orden.
- **Rate limiting** por IP y por wallet.

## Endpoints (REST)
- `GET  /quotes?side=buy|sell&fiat=EUR&crypto=USDC&amount=100`  
- `POST /orders` — crea orden (`side`, `fiat`, `crypto`, `amount`, `walletAddress`, `provider`, `kycEvidence`, `idempotencyKey`)
- `GET  /orders/:id` — estado
- `POST /webhooks/:provider` — recepción de eventos del proveedor (firma requerida)
- `GET  /kyc/:walletId` — estado KYC
- `POST /kyc/submit` — (re)envío de evidencia KYC `{ walletId, evidence }`
- `GET  /audit/:scopeId` — entradas de auditoría (scope = walletId u orderId)

## Configuración
Variables de entorno (opcional):
- `DATABASE_URL` (por defecto `data/fiat_ramp.db`)
- `PORT` (por defecto `8081`)
- `WEBHOOK_TOLERANCE_SEC` (por defecto `300`)
- **Secretos por proveedor** (pre‑registrados):
  - `PROVIDER_MOCK_APIKEY`, `PROVIDER_MOCK_WEBHOOK_SECRET_V1`
  - (Puedes añadir más en `src/providers/*`)

## Uso rápido
```bash
pnpm i
pnpm build
pnpm start
# Probar quotes:
curl "http://localhost:8081/quotes?side=buy&fiat=EUR&crypto=USDC&amount=150"

DoD

Agregación de cotizaciones multi‑proveedor con ordenamiento y desgloses.

Creación y actualización del estado de órdenes vía webhook firmado.

Auditoría apend‑only con hash encadenado.

Pruebas unitarias: cálculo de comisiones, verificación de firma HMAC, ordenación de cotizaciones.


/apps/payments/fiat-onofframp/package.json
```json
{
  "name": "@gnew/fiat-onofframp",
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
    "rate-limiter-flexible": "^5.0.0",
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


