# Realtime (WS/SSE Gateway) - WebSocket + SSE para *updates* inmediatos de **gobernanza** y 
**economía**. - Backpressure con colas por conexión (`MAX_QUEUE`) y *shedding* de 
mensajes antiguos. - Presencia por sala (join/leave, ping/pong), exportada a métricas 
Prometheus. - Trazas y métricas OTEL + `prom-client` para vigilar **P95 < 300ms** 
(`rt_broadcast_latency_seconds`). 
## Endpoints - `GET /health` – estado básico (JSON). - `GET /metrics` – Prometheus. - `GET /sse/:room` – SSE autenticado (Authorization: Bearer ...). - `POST /demo` – publica un evento de prueba en NATS. 
## NATS - `gov.events` → sala `governance` - `economy.events` → sala `economy` 
## Seguridad - Autenticación vía `@repo/auth-client` y JWKS del servicio `auth`. 
## SRE - Usa `rt_broadcast_latency_seconds` para panel p95 y alertas. - `rt_dropped_messages_total` para detectar backpressure sostenido. - `rt_room_members{room=...}` para presencia. 
 
> Objetivo DoD: mantener `histogram_quantile(0.95, 
rate(rt_broadcast_latency_seconds_bucket[5m])) < 0.3` 
 
 
