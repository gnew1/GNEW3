
# SubscriptionManager — Pagos Recurrentes con Pull‑Payments (N154)

> Prompt: **N154 16.4 Pagos recurrentes y suscripciones** — Suscripciones en stablecoins con Account Abstraction (AA).  
> Stack: Pull‑payments, cron on‑chain/off‑chain confiable.  
> Entregables: contrato de suscripción, panel de cobros.  
> Pasos: alta/baja, prorrateo, fallbacks de cobro.  
> DoD: reintentos con backoff; avisos previos al cargo.  
> Controles: límites por período; grace period. :contentReference[oaicite:0]{index=0}

Este paquete provee un **contrato Solidity** para gestionar **planes de suscripción** y **cobros pull** en tokens ERC‑20 (stablecoins).  
Incluye *prorrateo opcional* por anclaje de período, **grace period** y utilidades para automatización (keepers/off‑chain).

- **/contracts/subscriptions**: contrato `SubscriptionManager.sol` + tests Hardhat.
- **/apps/payments/subscriptions-api**: API REST (SQLite) para panel y operaciones.
- **/apps/payments/subscriptions-scheduler**: *worker* con reintentos (exponencial) y avisos previos.

## Flujo
1) **Merchant** crea un **Plan** (`createPlan`): token, importe por período, duración (segundos) y ancla opcional (p. ej., primer día de mes UTC).  
2) **Usuario** crea una **Suscripción** (`subscribe`) y concede *allowance* del token al contrato, o `permit` si el token lo soporta.  
3) **Cobro** (`charge`) por *cron* confiable (AA *userOp* o keeper).  
4) *Grace period* configurable: si falla el cobro dentro de ventana, se reintenta con **backoff**.  
5) Cancelación por usuario/merchant.

> El contrato **no custodia fondos**; solo ejecuta `transferFrom` con allowance. El *scheduler* usa AA (bundler) o clave de servicio.

## Comandos rápidos
```bash
pnpm i
pnpm -C contracts/subscriptions test
pnpm -C apps/payments/subscriptions-api start
pnpm -C apps/payments/subscriptions-scheduler start


/contracts/subscriptions/package.json
```json
{
  "name": "@gnew/contracts-subscriptions",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "hardhat compile",
    "test": "hardhat test"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-chai-matchers": "^2.0.0",
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@types/chai": "^4.3.11",
    "@types/mocha": "^10.0.6",
    "chai": "^4.4.1",
    "ethers": "^6.13.1",
    "hardhat": "^2.22.10",
    "typescript": "^5.5.4"
  }
}


