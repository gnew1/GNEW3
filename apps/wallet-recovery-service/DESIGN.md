# Wallet Recovery Service — Diseño

Objetivo: Flujo de recuperación con guardianes y notificaciones.

Interfaces
- startRecovery(addr): recoveryId
- approve(recoveryId, guardian): ok
- notify(user, channel, msg): ok (webhook/email/sms)

Datos
- Estado por recoveryId (proposedOwner, approvals, deadline).

Seguridad
- Rate limits; antifraude básico; PKI de webhooks.

Observabilidad
- Métricas: recoveries_started, approvals_count; audit logs.

Configuración
- Umbral de guardianes; canales habilitados.

Edge cases
- Guardian offline; expiración; duplicados.

DoD
- Tests de flujo completo; mocks para email/sms; idempotencia.
