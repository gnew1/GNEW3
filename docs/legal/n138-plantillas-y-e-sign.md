# N138 — Plantillas legales y e‑sign 
 
## Flujo 
1) **Plantillas versionadas** (YAML+HTML) → `templates/reload` → 
snapshot en DB con `checksum`.   
2) **Envelope**: crear desde plantilla, validar `fieldsSchema` (AJV), 
render a PDF y calcular **SHA‑256**.   
3) **Envío**: generar enlaces HMAC de firma por **orden**; soporte de 
firmante interno (subjectId) o externo (email).   
4) **Firma**: al firmar se añade **página de certificado** con nombre, 
IP, UA y fecha; se recalcula **SHA‑256**.   
5) **Cierre**: cuando todos firman → `completed`, se calcula 
**chainHash** de `AuditEvent.eventHash` y se **ancla on‑chain** (Merkle 
root en `ConsentAnchor`) guardando `batchId`/`txHash`.   
6) **Auditoría**: `AuditEvent` encadenados (`prevHash`) y 
`Envelope.manifest` guardan versión y checksum usados. 
## Seguridad y privacidad - Datos de plantilla = **variables no sensibles**; PII mínima y 
seudónimos (IDs).   - Tokens de firma HMAC con `ESIGN_HMAC_SECRET`.   - No se registran imágenes de firma si no es requerido (pueden 
omitirse). 
## Versionado - SemVer por plantilla (`semver`); la `currentVer` se aplica por 
defecto. Cambios legales = nueva versión.   - `checksum` del binario HTML + metadata para garantizar integridad. 
