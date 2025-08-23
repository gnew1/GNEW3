# N139 — Notificación de brechas 
 
## Flujo operable 
1) **Crear incidente** (descubrimiento, resumen, jurisdicciones, 
categorías iniciales).   
2) **Checklist**: baseline + específica por jurisdicción 
(GDPR/LGPD/US).   
3) **Evaluación** (severidad S0–S3, riesgo, volumen): se recalcula 
obligación de notificar.   
4) **Cronograma**: se generan **tareas** con `dueAt` (p. ej., DPA ≤ 
72h EU; sujetos si riesgo alto).   
5) **Entrega y acuse**: cada tarea se **envía**, se guarda 
`ackId/ackAt`, payload/response `sha256`.   
6) **Registros**: `TimelineEntry` con hashing encadenado + anclaje 
Merkle en `ConsentAnchor`.   
7) **Cierre**: al finalizar, se ancla el lote final del timeline. 
## Checklist (mínima) - Contención, preservación de evidencia, alcance, análisis de riesgo, 
consulta Legal, borradores, scheduling, DSAR‑hotline, post‑mortem.   - GDPR: evaluar art. 34, notificar DPA (≤72h), notificar interesados 
si riesgo alto.   - LGPD: notificar ANPD (48h).   - US: mapear estados aplicables (implementación granular en N136+ 
iteración). 
## SLA/Cronograma - Configurable en `policies.yml` por **jurisdicción**. El servicio 
calcula `dueAt` desde `discoveredAt`.   - Reintentos con backoff exponencial configurable. 
## Privacidad/Seguridad - No se tratan PII fuera de seudónimos; plantillas referencian 
categorías y cifras agregadas.   - Evidencias con `sha256` y ruta.   - Tokens/secretos solo por env. 
## Integraciones - **OPA (N135)**: PEP puede llamar a PDP para exigir roles 
(`security_incident_admin`, `legal_admin`).   - **Jurisdicción (N136)**: puede alimentar obligaciones por país si se 
amplía la granularidad.   - **Reportes (N137)**: se pueden exportar incidentes y acuses a 
reportes regulatorios. 
