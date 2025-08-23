
# Runbook M9 - Gestión de Claves y DIDs

## Objetivo
- Crear y administrar DIDs interoperables con soporte avanzado (MPC/TSS, WebAuthn, HSM/KMS).

## Pasos
1. Levantar servicio:
   ```bash
   npm run start:did


Crear DID:

curl -X POST http://localhost:4009/dids


Consultar DID:

curl http://localhost:4009/dids/<id>


Asociar dispositivo:

curl -X POST http://localhost:4009/dids/<id>/bind -H "Content-Type: application/json" -d '{"deviceId":"device-123"}'

DoD

API REST funcional.

Tests unitarios en CI.

Documentación y runbook operativo.


/README-M9.md
```markdown
# M9: Gestión Avanzada de Claves y DIDs

## Entregables
- Servicio `/services/identity/m9-key-did-manager.ts`.
- Tests `/tests/identity/test_m9_key_did_manager.test.ts`.
- Workflow CI `/ops/ci/m9-did.yml`.
- Runbook `/ops/runbooks/m9-did.md`.

## Commit sugerido


feat(identity): implementar módulo M9 para gestión avanzada de DIDs y claves


## Riesgos y mitigaciones
- **MPC/TSS stub**: migrar a librerías reales en N124.
- **Persistencia en memoria**: añadir DB descentralizada.
- **WebAuthn/HSM**: integración simulada, extender hacia librerías estándar.


M_pointer actualizado: M10 ✅

