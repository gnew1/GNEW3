# VC BBS+ Suite — Diseño

Objetivo: Emisión/verificación de VC con firmas BBS+, derivación de pruebas selectivas.

Interfaces
- issue(credential, issuerKey): VerifiableCredential
- deriveProof(vc, revealDoc, nonce): DerivedProof
- verifyProof(proof): boolean

Datos
- VC JSON-LD (W3C), context @v1, suite BBS+.
- revealDoc JSON-LD con campos a revelar.

Dependencias
- jsonld canonicalization; bbs-signatures; DID resolver.

Seguridad
- Keys desde KMS (no disco). Revocación con statusList.
- Anti-replay: nonce en pruebas.

Observabilidad
- Métricas: issue_count, verify_latency. Logs con traceId.

Configuración
- KMS provider (aws|vault), DID method allowlist.

Edge cases
- Contextos desconocidos; reloj desincronizado; revocado/expirado.

DoD
- Pruebas: emitir, derivar, verificar (happy/negativo). 95% líneas en módulo.
- Conformidad con JSON-LD Signatures BBS+.
