# N133 — Consentimiento granular (finalidad × canal) 
 - **Canales**: web, in_app, email, sms, push, onchain. - **Principios**: 
  - “Estrictamente necesario” sin toggle; resto **opt‑in** (UE). 
  - GPC ⇒ denegar marketing + personalización cross‑canal salvo 
override explícito. 
  - Preferencias por canal **no implican** otras (p. ej., email≠push). - **Evidencia**: ConsentEvent con `eventHash`, lote Merkle y anclaje 
(ConsentAnchor). - **Recibos**: export desde Privacy page (CSV/JSON). 
 
 
DoD (Definition of Done) — N133 
● Banner activo en EU que bloquea scripts de analítica antes de consentimiento; soporta 
Aceptar/Rechazar/Personalizar. 
 
● Flujos por canal (modal) para email/SMS/push/on‑chain con escritura a 
/v1/consent/:subjectId/decisions incluyendo channelKey. 
 
● Guard en servicios (web/email/push) que llama ensureAllowed(use, 
dataCategory, channel) con fallback global. 
● Unsubscribe por token HMAC que actualiza marketing:email → denied. 
● GPC honrado (archivo .well-known/gpc.json y lógica en banner). 
● Pruebas legales (Cypress + YAML de aceptación) pasan: 
○ Bloqueo previo; 
○ Opt‑in explícito por canal; 
○ Baja efectiva por enlace. 
● Auditoría: eventos con hash + prevHash; anclaje por lotes en ConsentAnchor. 
Playbooks (operativos) 
● Región/edad: activar banner EU por IP/georesolver o preferencia de cuenta; menores 
→ forzar marketing off. 
● Sincronización campañas: el job de marketing debe filtrar por 
ensureAllowed(subjectId,"marketing","email","email"). 
● Incidencias: si un script se carga sin consentimiento, bloquear en middleware.ts y 
abrir incidente “Privacy‑Blocker”. 
Variables de entorno 
CONSENT_API=https://consent-svc.internal 
UNSUB_HMAC_SECRET=change_me 
¿Quieres que añada en la siguiente entrega pruebas de Merkle‑inclusion en la consola y 
plantillas multi‑idioma de textos legales (ES/EN/PT) para el banner y el flujo por canal? 
Tú dijiste: 
programa a nivel de detalle para GNEW N134 14.4 Screening sanciones/PEP (Prompt 134) 
Objetivo: Bloquear sujetos en listas. Roles: Cumplimiento, Back. DoD: listas actualizadas; 
evidencia de bloqueo. 
ChatGPT Plus 
Pensó durante 30s 
/apps/screening-svc — GNEW N134 · 14.4 Screening sanciones/PEP (bloqueo con evidencia) 
A continuación tienes el programa a nivel de detalle y entrega con arquitectura, modelos, 
flujos, código listo para pegar (TypeScript/Prisma/OpenAPI/YAML), CI/CD, pruebas y 
playbooks. Coherente con N130–N133 (hashes, Merkle, ConsentAnchor, seudonimización, 
OTel, GitFlow, SBOM). 
Objetivo 
Detectar y bloquear sujetos (personas/empresas/wallets) si aparecen en listas de sanciones 
(OFAC, UE, ONU, HMT, SECO, etc.) o PEP (Personas Expuestas Políticamente), con: 
● Listas actualizadas automáticamente (descarga, verificación de integridad, 
versionado). 
● Screening en alta, login, KYC-lite, emisión de tokens/airdrops y antes de 
transacciones. 
● Evidencia de bloqueo: detalle de coincidencia, score, snapshot de lista, firma 
Ed25519 y anclaje (Merkle root) en contrato ConsentAnchor. 
Roles: Cumplimiento (lead), Backend. 
DoD: 1) listas en “verde” (actualizadas/firmadas) 2) flujo de bloqueo activo con registro 
auditable. 
Arquitectura 
● apps/screening-svc (Express + Prisma + Jobs): API de screening, descarga y 
normalización de listas, scoring, decisiones y evidencias. 
● Connectors (packages/screening-connectors): http-json/csv/xml para 
fuentes públicas; stub de proveedores comerciales. 
 
● Matching Engine: normaliza y puntúa (Jaro‑Winkler + token/alias + fecha 
nacimiento/país/doc + wallets on‑chain). 
 
● Enforcement SDK (packages/screening-guard): middleware para servicios 
(registro/tx/email/pagos) → bloquea si status=blocked. 
 
● Auditoría: ScreeningEvent → lote Merkle → ConsentAnchor.storeRoot(...). 
 
● Observabilidad: métricas de cobertura y TPR/FPR, trazas. 
 
 
Catálogo de fuentes (config) 
