
# Subscriptions API (panel de cobros)

API REST para gestionar **planes**, **suscripciones**, conciliación y **avisos previos**.

- **SQLite** para estado operativo (planes/suscripciones/intent de cobro).
- **Webhooks/Notificaciones**: pre‑cargo (p. ej. 72/24/1h antes).
- Pensada para AA/**ERC‑4337**: los cobros se envían como *userOp* desde el **scheduler**.

Endpoints:
- `POST /plans` { token, amount, periodSeconds, anchorTimestamp, graceSeconds }
- `POST /subscriptions` { planId, subscriber, prorateFirst, contact }
- `POST /subscriptions/:id/cancel`
- `GET /subscriptions/due` — próximas a cobrar (para UI)
- `GET /audit/:scopeId`


