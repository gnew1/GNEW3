## Variables de entorno 
DATABASE_URL=postgres://... 
WAREHOUSE_PG_URL=postgres://warehouse... 
PGP_SIGN_KEY="-----BEGIN PGP PRIVATE KEY-----\n...\n-----END PGP 
PRIVATE KEY-----" 
FIU_CLIENT_CERT_PEM="-----BEGIN CERTIFICATE-----\n...\n-----END 
CERTIFICATE-----" 
FIU_CLIENT_KEY_PEM="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE 
KEY-----" 
AML_API_TOKEN=... 
TAX_SFTP_USER=... 
TAX_SFTP_PASS=... 
RPC_URL=... 
ANCHOR_PK=0x... 
CONSENT_ANCHOR_ADDR=0x... 
## Demostración rápida 
1. `POST /v1/reports/definitions/reload` → snapshot en DB. 
2. Esperar scheduler o `POST /v1/reports/runs/schedule` con período → 
crea `ReportRun`. 
3. Ver `/v1/reports/runs/{id}` → artefactos (`data`, `pgp_encrypted`, 
`ack`) y `deliveries`. 
4. Simular fallo (URL inválida) → observar `reintentos` hasta 
`failed`. Corregir y `.../retry`. 
5. Confirmar `acknowledged` y `ReportEvidence.anchor_tx`. 
Notas de integración 
● Seguridad & PII: solo seudónimos. Si la norma requiere PII, mover resolución a DWH 
seguro con minimización (N132) y cifrado por campo; nunca loggear PII. 
● OPA (N135): puedes exigir allow antes de enviar (p. ej., ventanas de envío, países 
restringidos). Añadir PEP de política si procede. 
● Jurisdicción (N136): usa el motor para determinar si un país exige un informe 
específico (activar definiciones por jurisdicción). 
● Screening (N134): incluye métricas de sanciones en SAR (risk_score, flags) ya 
seudonimizadas. 
¿Te agrego en la siguiente iteración un panel React para monitorear runs (cola de envíos, 
estado en vivo, botón “reintentar”), más poller de ACK SFTP programado y render XBRL 
(esqueleto) para obligaciones tributarias? 
Tú dijiste: 
programa a detalle para gnew N138 14.8 Plantillas legales y e-sign (Prompt 138) Objetivo: 
Generar contratos con e-sign. Roles: Legal, Back. DoD: hash on-chain; versionado. 
ChatGPT Plus 
Pensó durante 48s 
/apps/esign-svc — GNEW N138 · 14.8 Plantillas legales y e‑sign (hash on‑chain + 
versionado) 
A continuación tienes el programa a nivel de detalle y entrega, con arquitectura, modelos, 
plantillas versionadas, API, código listo para pegar (TypeScript/Prisma/HTML/YAML), 
render a PDF, flujo de firma, acuses y evidencias, Merkle + anclaje on‑chain (reuso 
ConsentAnchor), CI/CD y pruebas. Coherente con N130–N137. 
