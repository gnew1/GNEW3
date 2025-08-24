# Tax Engine — Withholding — Diseño

Objetivo: Cálculo de retención por país (tabla simple, extensible).

Interfaces
- computeWithholding(country, incomeType, amount): {tax, reason}
- loadTable(src): ok

Datos
- Tabla (país→reglas). Versionado por fecha.

Seguridad
- Validación de inputs; límites de cantidad; logs de cálculo.

Observabilidad
- Métricas: calls, cache_hits, p95_latency.

Configuración
- Países habilitados; fuente de reglas.

Edge cases
- País desconocido; tipos no soportados; decimales/rounding.

DoD
- Tests por país/escenarios; fixtures con snapshots.
