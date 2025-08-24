# Onchain Forecast — Diseño

Objetivo: API de predicción (riesgo/volumen) con pipeline de entrenamiento.

Interfaces
- predict(entityId, features?): {score, conf, modelVersion}
- train(datasetRef, params): modelVersion

Datos
- Feature store (lagged tx, centralidad, balances); modelos versionados.

MLOps
- Entrenamiento programado; validación offline; drift detection; rollback.

Seguridad
- PII minimizada; controles de acceso a datasets y modelos.

Observabilidad
- Métricas: auc, drift_rate, latency, stale_model_age.

Edge cases
- Falta de features; datos corruptos; drift súbito; límites de latencia.

DoD
- Endpoint predict con mocks; pipeline de training mínimo; validaciones y alertas.
