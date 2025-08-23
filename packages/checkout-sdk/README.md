
# GNEW Checkout SDK (N155)

SDK TypeScript para integrar **checkout** con:
- **Fiat On/Off‑Ramp** (`@gnew/fiat-onofframp`) → cotizaciones y órdenes.
- **Suscripciones** (`@gnew/subscriptions-api` + contrato `SubscriptionManager`) → alta/baja y estado.

> Stack: Node 20+/Browser, TypeScript 5, ESM, `fetch` nativo (sin dependencias).

## Instalación
```bash
pnpm -F @gnew/checkout-sdk build

Uso rápido
import { FiatRampClient, SubscriptionsClient } from "@gnew/checkout-sdk";

const fiat = new FiatRampClient({ baseUrl: "http://localhost:8081" });
const quotes = await fiat.getQuotes({ side: "buy", fiat: "EUR", crypto: "USDC", amount: 150 });

const order = await fiat.createOrder({
  side: "buy",
  fiat: "EUR",
  crypto: "USDC",
  amount: 150,
  walletAddress: "0xYourWallet",
  provider: quotes[0].provider
});

const subs = new SubscriptionsClient({ baseUrl: "http://localhost:8082" });
const plan = await subs.createPlan({ token: "mUSD", amount: 1000, periodSeconds: 30*86400, anchorTimestamp: 0, graceSeconds: 7*86400 });
const sub  = await subs.createSubscription({ planId: plan.id, subscriber: "0xYourWallet", prorateFirst: false });

API principal

FiatRampClient.getQuotes(req)

FiatRampClient.createOrder(params)

FiatRampClient.getOrder(id)

SubscriptionsClient.createPlan(...)

SubscriptionsClient.createSubscription(...)

SubscriptionsClient.cancelSubscription(id)

SubscriptionsClient.listDue() (para paneles/diagnóstico)


/packages/checkout-sdk/package.json
```json
{
  "name": "@gnew/checkout-sdk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "exports": {
    ".": "./dist/index.js"
  },
  "sideEffects": false,
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "node --version"
  },
  "devDependencies": {
    "typescript": "^5.5.4"
  }
}


