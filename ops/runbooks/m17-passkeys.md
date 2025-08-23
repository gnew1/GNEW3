
# Runbook M17 - Autenticación fuerte y device binding (Passkeys)

## Objetivo
- Autenticación sin contraseña con WebAuthn.
- Binding de dispositivo a identidad GNEW.
- Resistencia a phishing y reutilización.

## Flujo
1. `PasskeyManager` genera opciones de registro.
2. API registra respuesta WebAuthn y la almacena.
3. API genera challenge para login.
4. API valida autenticación contra credenciales guardadas.

## DoD
- Tests unitarios de registro y login verdes.
- CI ejecuta pipeline `m17-passkeys.yml`.
- Runbook documentado.


