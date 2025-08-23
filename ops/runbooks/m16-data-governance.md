
# Runbook M16 - Gobierno del dato

## Objetivo
Implementar cifrado por campo, anonimización opcional y control de retención.

## Flujo
1. `FieldEncryptor` cifra/des cifra datos sensibles.
2. API expone endpoints de cifrado.
3. Hook React consume la API para apps cliente.
4. CI valida la funcionalidad.

## DoD
- Tests unitarios verdes.
- Campos sensibles cifrados y controlados por políticas.
- Runbook documentado.


