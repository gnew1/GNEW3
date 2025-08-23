
# M17: Autenticación fuerte y device binding (Passkeys)

## Entregables
- Servicio `/services/auth/passkeys/passkeyManager.ts`
- Utilidades `/services/auth/passkeys/webauthnUtils.ts`
- Endpoints API `/apps/dao-web/pages/api/auth/passkeys/register.ts` y `login.ts`
- Tests `/tests/auth/test_m17_passkeys.spec.ts`
- CI `/ops/ci/m17-passkeys.yml`
- Runbook `/ops/runbooks/m17-passkeys.md`

## Commit sugerido


feat(auth): soporte de autenticación fuerte con Passkeys (WebAuthn)


## Riesgos
- **Compatibilidad de navegadores**: mitigación → fallback a OTP/email.
- **Gestión de dispositivos múltiples**: mitigación → permitir múltiples credenciales por usuario.


M_pointer actualizado: M18 ✅

