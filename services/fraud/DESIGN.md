# M8 Fraud Detector — Diseño

Objetivo: Heurísticas + señal ML (stub) para riesgo de fraude en eventos.

Interfaces
- scoreEvent(event): {score: 0..1, reasons: string[]}
- ruleset(update): ok

Señales
- Velocidad, geodispersión, colusión, device fingerprint.

Seguridad
- Explainability básica; límites por cliente.

Observabilidad
- Métricas: p95_score_latency, alerts/sec.

Edge cases
- Datos faltantes; picos de tráfico; cold-start del modelo.

DoD
- Reglas determinísticas con tests; stub ML aislable; umbrales calibrados.
