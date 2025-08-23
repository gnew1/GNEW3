# N68 — Dashboard de seguridad

## Objetivo
Visibilidad central de **riesgos** y **alertas**: incidentes, CVEs, latencias y disponibilidad, con **MTTD** y SLOs accionables.

## Fuentes integradas
- **CI/SBOM** → `/ingest/cves` (Trivy/Snyk/Grype).
- **Apps** → `/metrics` (authz, messaging, feedback).
- **Red** → Blackbox exporter para endpoints críticos.
- **OpenTelemetry** → métricas/trazas/logs → Prom/Tempo/Loki.
- **SC** (opcional) → ingesta de reportes Slither/Foundry via `sec-bridge`.

## KPIs en panel
- CVEs por severidad (gauge).
- MTTD (media 1h) vs SLO.
- p95 de autorización (`authz_eval_ms`) y otras latencias clave.
- Incidentes abiertos (por severidad).
- Alertas activas y disponibilidad HTTP.

## Alertas (SLOs)
- **CriticalCVEsDetected**.
- **AuthzLatencySLOExceeded** (p95>50ms).
- **EndpointDown** (blackbox).
- **MTTD_SLO_Breached** (media 1h > SLO).
- **PromScrapeStale** (higiene de monitoreo).

## DoD
- **Tiempo de detección < N min**: `security:mttd_slo_seconds = N*60` (por defecto 300s).
- Evaluación authz p95 < 50ms (alerta si excede 5m).
- Panel operativo visible para SRE/Sec/Data; Alertmanager integrado con Slack/PagerDuty.

 
Cómo operar (rápido)
1.	Despliega sec-bridge y apunta tus pipelines de CI a POST /ingest/cves (ya tienes un workflow de ejemplo).

2.	Carga Prometheus/Alertmanager/Grafana con los manifests provistos y ajusta security:mttd_slo_seconds al valor de tu SLO (N minutos).

3.	Apunta tus servicios (N60/N61/N67, etc.) al OTLP del Collector para métricas/trazas/logs.

4.	Verifica el panel “GNEW – Seguridad (KPIs & Alertas)” y fuerza una prueba (simula un incidente y registra opened_at/detected_at en /ingest/incident/detected) para ver MTTD calculado.

¿Quieres que te entregue además un dashboard de trazas (Grafana Tempo) con correlación por decisionId de authz y un exporter para parsear reportes de Slither/Trivy automáticamente?
Tú dijiste:
programa a nivel de detalle para gnew N69 7.9 Recuperación de fondos (Prompt 69) Objetivo: Mecanismos post-explot para rescate/pausa. Roles: Seguridad, Gobernanza, Legal. Stack: Pausable, timelock emergencia, multisig. Entregables: Runbooks, contratos “guardian”. Pasos: Activación por quorum/guardian. Procedimiento de reembolso. DoD: Simulacro exitoso. Riesgos & Controles: Abuso → condiciones y auditoría comunitaria.
ChatGPT Plus
Pensó durante 1m 0s
