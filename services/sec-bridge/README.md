# sec-bridge
Puente de ingesta para métricas de seguridad (CI, SC, redes) → Prometheus.

## Endpoints
- `POST /ingest/cves` — payload: `{ items: [{ severity: "critical|high|...", count: N, source: "snyk|trivy|..." }, ...] }`
- `POST /ingest/incident/open|close` — abre/cierra incidentes abiertos (para panel).
- `POST /ingest/incident/detected` — registra MTTD (`opened_at`, `detected_at` en epoch seconds).

## Métricas
- `sec_cves_total{severity,source}` (Gauge)
- `sec_incidents_open_total{severity}` (Gauge)
- `sec_incidents_new_total{severity,source}` (Counter)
- `sec_mttd_seconds_bucket/sum/count` (Histogram)

