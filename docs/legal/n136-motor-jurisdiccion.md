# N136 — Motor de jurisdicción (impuestos, KYC, límites) 
 - **Propósito**: resolver obligaciones por país/region/producto (VAT, 
KYC, límites transaccionales) y alimentar a PEP/OPA. - **Fuentes**: Legal gestiona `jx.rules.yaml` mediante PR; el servicio 
materializa snapshot y publica `/catalog`. - **Contratos**: 
  - Entrada: `country`, `productType`, `kycLevel`, `isPEP`, 
`sanctionsStatus`, `amount`, `currency`. 
  - Salida: `tax`, `kyc`, `limits`, `obligations`, `version`. - **Auditoría**: cada `resolve` genera `JurisdictionDecision` con 
`eventHash` → lote Merkle → `ConsentAnchor`. - **Cobertura**: DoD exige **ES, FR, DE, NL, PT, IT, UK** (covered) y 
**US, BR, MX** (partial). Añadir estados/subdivisiones en iteraciones. 
 
 
DoD (Definition of Done) — N136 
● Cobertura de países objetivo: ES, FR, DE, NL, PT, IT, UK (covered). US/BR/MX 
marcados como partial (sin granularidad estatal aún). 
 
● API operativa: 
 
○ GET /v1/jx/catalog devuelve versión activa y cobertura. 
○ GET /v1/jx/{CC}/effective y POST /v1/jx/resolve devuelven reglas 
y obligaciones (tax/KYC/límites). 
● Políticas versionadas en jx.rules.yaml (SemVer) con validación por JSON 
Schema y publicación en DB (JurisdictionPolicy). 
● Pruebas pasan (engine.spec) y CI valida OpenAPI y construcción. 
● Evidencia de bloqueo/obligaciones: JurisdictionDecision con eventHash, lote 
y txHash tras job de anclaje. 
● Integraciones: middleware jxGate en pagos aplica límites y expone facts para OPA 
(N135) y sincroniza embargos con N134. 
Variables de entorno 
DATABASE_URL=postgres://... 
JX_API=https://jurisdiction-svc.internal 
RPC_URL=... 
ANCHOR_PK=0x... 
CONSENT_ANCHOR_ADDR=0x... 
Cómo demostrarlo 
1. GET /v1/jx/catalog → ver version y coverage con ES/FR/DE/NL/PT/IT/UK 
covered. 
2. GET /v1/jx/ES/effective?productType=digital → VAT aplicable y niveles 
KYC. 
3. POST /v1/jx/resolve { country:"ES", productType:"digital", 
kycLevel:"BASIC", amount:300 } 
→ limits.tx_max < 300 ⇒ error en jxGate (422). 
4. País embargado: { country:"IR", productType:"service" } ⇒ 
obligations incluye block_embargo. 
5. Revisar JurisdictionDecision y txHash tras job de anclaje. 
¿Quieres que añada en la siguiente iteración granularidad por estado (US‑CA/US‑NY, BR‑SP, 
MX‑CMX), rondas automáticas de actualización de VAT y una UI de matriz para que Legal 
compare países y exporte a CSV? 
Tú dijiste: 
continua la programación a detalle N137 14.7 Reportes regulatorios (Prompt 137) Objetivo: 
Envío automático de informes. Roles: Back, Data, Legal. DoD: acuses/recepción; reintentos. 
ChatGPT Plus 
Pensó durante 1m 5s 
/apps/regrep-svc — GNEW N137 · 14.7 Reportes regulatorios (envío automático + acuses y 
reintentos) 
A continuación tienes el programa a nivel de detalle con arquitectura, DSL YAML, APIs, 
código listo para pegar (TypeScript/Prisma/YAML/SQL), conectores (HTTPS/SFTP), PGP + 
firma, reintentos con backoff, acuses/recepciones y anclaje auditable (Merkle → 
ConsentAnchor). Coherente con N130–N136 (seudonimización, OTel, CI/CD, 
Policy‑as‑Code). 
