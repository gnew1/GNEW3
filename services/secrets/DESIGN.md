# Secrets — Envelope + KMS Providers

Objetivo: Envolvente de llaves (DEK) con KMS/HSM (AWS KMS, Vault Transit).

Interfaces
- generateDEK(aud): {ciphertext, keyId}
- encrypt(plaintext, aad): {ciphertext, iv, tag}
- decrypt(blob, aad): plaintext

Datos
- AES-GCM 256 (DEK); KEK gestionada por KMS.

Dependencias
- @aws-sdk/client-kms | Vault Transit API; jose/webcrypto.

Seguridad
- Rotate KEK; at-rest policy; audit trail (who/when).

Observabilidad
- Métricas: encrypt_count, kms_latency; logs de auditoría con requestId.

Configuración
- KMS arn/path; cache TTL de DEK; límites de tamaño.

Edge cases
- AAD mismatch; token KMS expirado; throttling/retry con backoff.

DoD
- Tests unitarios (encrypt/decrypt, tamper, rotate). Fuzz de inputs.
