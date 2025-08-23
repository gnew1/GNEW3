
# Subscriptions Scheduler (cron confiable + backoff)

Worker que:
- Lee `/subscriptions-api` → `/subscriptions/due`.
- Envía **cobros** al contrato `SubscriptionManager.charge(planId, subscriber)`.
- **AA-ready**: puede usar un **bundler ERC‑4337** o un EOA de servicio.
- Reintenta con **backoff exponencial** (1m, 5m, 15m, 1h…) dentro del **grace period**.
- Envía **avisos previos** T‑72h/T‑24h/T‑1h (webhook/console stub).

Variables: `RPC_URL`, `CONTRACT_ADDRESS`, `BUNDLER_URL?`, `PRIVATE_KEY?`, `API_BASE=http://localhost:8082`.


