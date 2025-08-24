# DID Resolver/Storage — Diseño

Objetivo: Resolver DIDs (did:gnew, did:key, did:pkh). Almacén opcional.

Interfaces
- resolve(did): DIDDocument
- store(didDoc): cid/url (opcional)

Datos
- DID Document (verificationMethod, services). Hash de contenido.

Dependencias
- did-resolver; métodos específicos; opcional Ceramic/Ion adapter.

Seguridad
- Validar contentHash/digest; CORS y firmantes permitidos.

Observabilidad
- Métricas: resolve_latency, hits/misses de cache.

Configuración
- Cache TTL, allowed methods, endpoint externos.

Edge cases
- DID malformado; documento grande; timeouts a red externa.

DoD
- Resolver local did:gnew; mapeo de demo para key/pkh; tests de errores.
