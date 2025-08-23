# N66 — Cifrado de comunicaciones (E2E, PFS, Rotación)

## Objetivo
- **E2E**: el backend sólo enruta ciphertext; claves en cliente.
- **PFS**: Double Ratchet por mensaje; prekeys rotadas.
- **mTLS**: protección de API sensibles entre servicios.
- **KMS/HSM**: secretos de servidor (no E2E) con envelope encryption.

## Flujos
1. **Registro de prekeys** (cliente → servidor `/prekeys`).
2. **Inicio X3DH** (cliente A solicita bundle B `/prekeys/:user`, deriva secreto compartido).
3. **Sesión Double Ratchet** (A<->B): envío de `Packet{header, nonce, ciphertext}`.
4. **mTLS**: todo acceso a `/prekeys|/messages` exige certificado cliente válido (Envoy).
5. **Rotación**:
   - Prekeys: semanal (política).
   - TLS: 90 días.
   - KMS CMK: anual; DEKs por secreto (envelope).
6. **Revocación**: CRL/OCSP para TLS; invalidar prekeys y cerrar sesiones.

## DoD
- **Pentests** sin hallazgos críticos (OWASP MAS/ASVS aplicable).
- **PFS validado**: tests de ratchet pasan (ver `__tests__/pfs.test.ts`).
- **mTLS** activo: llamadas sin client-cert → 403 en Envoy.
- **Rotación**: evidencias (logs) de tareas de rotación ejecutadas según `policies/crypto/rotation.yml`.

