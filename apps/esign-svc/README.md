## Variables de entorno 
DATABASE_URL=postgres://... 
ESIGN_API=https://esign-svc.internal 
ESIGN_PUBLIC_BASE=https://app.gnew.org 
ESIGN_HMAC_SECRET=change_me 
RPC_URL=... 
ANCHOR_PK=0x... 
CONSENT_ANCHOR_ADDR=0x... 
## Demo rápida 
1. `POST /v1/templates/reload` 
2. `POST /v1/envelopes` con `templateKey:"msa"` + datos + firmantes 
3. `POST /v1/envelopes/:id/render` → devuelve `sha256` 
4. `POST /v1/envelopes/:id/send` 
5. `GET /v1/envelopes/:id/signers/:signerId/link` → abre 
`/sign/{token}` 
6. Firmar dos veces → `status=completed`, `txHash` presente (anclaje). 
Integraciones (coherencia GNEW) 
● N134 Screening: bloquear firma si subject está blocked (middleware opcional antes 
de /v1/envelopes/:id/send). 
● N135 OPA: policy “quién puede generar/firmar/anular” accesible en PEP (ej., sólo 
legal_admin puede void). 
● N132 Retención: Envelope y artefactos se etiquetan con TTL (p.ej. 7 años) para purga 
automática. 
● N137 Reportes: hashes y txHash pueden agregarse a reportes de cumplimiento. 
DoD (Definition of Done) — N138 
● Generación de contratos desde plantillas versionadas (SemVer + checksum), 
validadas por JSON Schema. 
● Flujo e‑sign end‑to‑end con enlaces HMAC, orden de firmantes y acuse certificado 
(página de cierre). 
● Hash on‑chain: al completar se ancla SHA‑256 del PDF final + chainHash de 
auditoría en ConsentAnchor guardando batchId y txHash. 
● Auditoría completa: AuditEvent con prevHash/eventHash. 
● Pruebas (jest) del flujo principal pasan en CI. 
¿Quieres que añada ahora render HTML→PDF con Puppeteer (impresión real con estilos), 
OTP por email para firmantes externos y una UI de consola Legal (lista de sobres, búsqueda, 
descarga del certificado)? 
Tú dijiste: 
continua la programación de gnew N139 14.9 Notificación de brechas (Prompt 139) Objetivo: 
Flujo de incidente y aviso legal. Roles: Seguridad, Legal, SRE. DoD: cronograma/registros; 
checklist legal. 
ChatGPT Plus 
Pensó durante 34s 
/apps/breach-svc — GNEW N139 · 14.9 Notificación de brechas (flujo de incidente + aviso legal 
· cronograma/registros + checklist) 
A continuación tienes el programa a nivel de detalle con arquitectura, modelos, DSL YAML de 
normativa/plantillas, API y código listo para pegar (TypeScript/Prisma/YAML/MD), tareas 
programadas con backoff, acuses/recepción, cronograma automatizado, registros/timeline 
con hashing encadenado y anclaje on‑chain (Merkle → ConsentAnchor). Coherente con 
N130–N138 (OPA/PDP, Retención, DSAR, Screening, Jurisdicción, Reportes, E‑sign). 
