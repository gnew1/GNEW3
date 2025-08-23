export async function ensureAllowed(subjectId: string, useKey: string, 
dataCategoryKey: string) { 
const res = await 
fetch(`${process.env.CONSENT_API}/v1/consent/${subjectId}`); 
const st = await res.json(); 
const rec = st.records.find((r:any)=> r.processingUseKey===useKey && 
r.dataCategoryKey===dataCategoryKey); 
if (!rec || rec.state !== "granted") throw new 
Error(`CONSENT_DENIED:${useKey}:${dataCategoryKey}`); 
} 
Cómo demostrar DoD en la demo 
1. Crear sujeto subj_123 → abrir Centro → opt‑in email × notifications, opt‑out 
device_id × analytics. 
2. Ver /audit: eventos con eventHash y prevHash. 
3. Ejecutar job de anclaje → ver batchId, tx_hash en /audit/batches. 
4. En servicio de marketing, llamar a ensureAllowed y observar bloqueo de uso no 
permitido. 
5. Descargar CSV/JSON con el recibo de consentimiento. 
Si quieres, en la siguiente iteración te añado Merklization proofs y contrato de pruebas para 
verificar inclusión de un eventHash en su batchId desde la UI de auditoría. 
Tú dijiste: 
programa a nivel de detalle para GNEW N131 14.1 DSAR/GPDR Console (Prompt 131) 
Objetivo: Solicitudes de acceso/borrado de datos. Roles: Privacidad, Back, Soporte. DoD: SLA 
de respuesta; borrado verificable. 
ChatGPT Plus 
Pensó durante 1m 2s 
/apps/dsar-svc — GNEW N131 · 14.1 
DSAR/GDPR Console (Solicitudes de 
acceso/borrado) 
A continuación tienes el programa a nivel de detalle y entrega, con arquitectura, APIs, 
modelo de datos, flujos, código base listo para pegar (TypeScript/React/SQL/YAML), CI/CD, 
pruebas y playbooks. Coherente con lo ya entregado en N130 (consent-svc): reutiliza 
seudonimización, OpenTelemetry, GitFlow, SBOM, y anclaje auditable on‑chain. 
Objetivo 
Console y servicio para DSAR (Data Subject Access Requests) en GDPR/CCPA: acceso y 
borrado (también restricción y rectificación si se habilita), con SLA configurable, export 
verificable y borrado/anonimización verificable, evidencias criptográficas y anclaje por 
lotes. 
● SLA objetivo (configurable por región): acuse < 24 h, respuesta final ≤ 30 días 
(auto‑extensión 30 días con justificación). 
● Borrado verificable: manifiesto de borrado + consulta de verificación + certificado 
firmado (Ed25519) + hash anclado on‑chain. 
Roles: Privacidad (lead), Backend, Soporte. 
DoD: SLA de respuesta cumplido; export completo; borrado verificable con certificado y 
evidencia reproducible. 
Arquitectura 
● apps/dsar-svc (Express + Prisma + Jobs): orquesta DSAR end‑to‑end. 
● Conectores (packages/dsar-connectors): Postgres/Prisma, S3, servicios internos 
(consent-svc, messaging), externos vía Webhook. 
● Console (admin): /apps/web/app/admin/dsar/ (Next.js + React + Zustand). 
● Auditoría: eventos DSAR → Merkle root por lote → ConsentAnchor (reutilizable como 
ancla de auditoría genérica). 
● Observabilidad: OpenTelemetry, métricas SLA, colas, reintentos. 
Modelo de datos (Prisma) 
