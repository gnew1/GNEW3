# Notifications (GNEW N76 8.6) 
**Objetivo:** Informar sin saturar (Web/Mobile) con **preferencias 
granulares**, **digest** y **opt-out fácil**. 
## Stack 
- Web Push (VAPID), FCM (Android), APNs (iOS) - Node.js + Express + Postgres + prom-client - OTEL + métricas de entregabilidad - Cron digest cada hora (configurable) 
## Endpoints - `POST /v1/subscribe` — registra `web|fcm|apns` (user_id, device_id, 
kind, subscription/token) - `GET/PUT /v1/prefs/:user` — CRUD de preferencias por categoría/canal 
(immediate|digest|mute) - `POST /v1/notify` — encola evento `{user_id, category, title, body, 
data?, priority?}` - `GET /v1/optout?u&sig&category` — baja con un click - `GET /v1/health`, `GET /metrics` 
## DoD - **Entregabilidad ≥95%**: métrica 
`notifications_deliverability_ratio` ≥ 0.95 en staging y prod durante 
la semana de validación, con `notifications_failed_total` < 5% del 
total. - **Opt-out fácil**: enlace en payload (`push.data.optout`) y página 
de confirmación (este servicio). - **No saturación**: `mode=digest` por defecto, quiet-hours (22–07) y 
*priority=high* bypass. 
