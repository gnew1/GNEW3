# Identity — MPC/TSS — Diseño

Objetivo: Custodia distribuida de claves y firmas TSS (ECDSA/EdDSA).

Interfaces
- createKey(tenant, algo): keyId
- sign(keyId, digest, policy): signature (TSS)
- rotate(keyId): newVersion

Datos
- Metadatos de la clave (tenant, uso, versiones); shards por nodo.

Dependencias
- Transporto autenticado entre nodos; HSM opcional; almacén confiable.

Seguridad
- Umbrales (t,n); atestación de participantes; políticas por tenant; audit trail.

Disponibilidad
- Reconfiguración dinámica; recuperación de nodo; quorum flexible.

Observabilidad
- Métricas: sign_latency, quorum_failures, node_health.

Edge cases
- Nodo caído; sesgo en nonce; replay; split-brain.

DoD
- Demo local 3-nodos (2-de-3) con tests; firmas válidas; auditoría mínima.
