(incluido arriba) 
11) Guía de integración (frontend) 
1. Detecta chainId y userAA. 
2. Llama a /ticket con {user, to, selector, chainId, policyId}. 
3. Crea UserOperation y asigna paymasterAndData = 
encodePaymasterAndData(...). 
4. Envía al Bundler; si falla por política/red, reintenta vía GSN. 
5. Mostrar “Patrocinado por GNEW” + enlace a política aplicada. 
12) Runbooks (extracto) 
● Reponer depósito: cast send entryPoint depositTo(paymaster) --value 
X → verificar en dashboard. 
● Actualizar allowlist: PR + propuesta DAO → timelock → setRule(...) → anuncio. 
● Rotar signer: generar PK en Vault → setSponsorSigner(new) → invalidar tickets 
(>validUntil). 
● Pausar: owner.pause() (si se añade Pausable) o fijar política vacía en Sponsor y 
cortar tickets. 
13) Riesgos clave y mitigaciones 
● Griefing por micro‑tx: caps por usuario/ventana + costo mínimo por acción + detección 
de patrón. 
● Firma filtrada: rotación y hot‑cut; tickets de vida corta (≤5 min). 
● Desalineación políticas on/off chain: versionado policyId y pruebas de humo en CI 
que validan paridad. 
● Out‑of‑deposit: alertas umbral y auto‑top‑up (job opcional con límites). 
14) Check de DoD (cerrado al entregar) 
● UX sin fricción en 3 flujos críticos 
✅
 
● Límites activos y observables 
✅
 
● Alertas/metrics operativas 
✅
 
● Documentación y demo reproducible 
✅
 
Siguientes pasos: enlazar con el módulo de Presupuestos DAO (N108) para 
ejecutar top‑ups automáticos controlados por governance y publicar el dashboard 
de gasto por guild en la app “Mi economía” (N29). 
Tú dijiste: 
programa a nivel de detalle para GNEW N121 13.1 Registro DID y anclaje (Prompt 121) 
Objetivo: Resolver/emitir DIDs con anclaje en GNEW. Roles: Identidad, Back. Stack: DID Core, 
Ceramic/ION; anchoring. DoD: CRUD de DID; pruebas interop. 
ChatGPT Plus 
Pensó durante 1m 51s 
