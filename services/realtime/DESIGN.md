# Realtime — Test Harness — Diseño

Objetivo: Servicio de tiempo real con harness de pruebas y métricas.

Interfaces
- publish(topic, msg): ok
- subscribe(topic, handler): unsub

Seguridad
- ACL por topic; límites de tasa; validación de payload.

Observabilidad
- Métricas: msgs/sec, drops, p95_latency; alertas p95/drops.

Configuración
- Backends (redis|nats); max inflight; retry policy.

Edge cases
- Backpressure; reconexiones; mensajes grandes.

DoD
- Tests unitarios + simulación de carga leve; alert rules listas.
