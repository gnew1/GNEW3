# Política-as-code (OPA) - Resumen 
 - **Reglas clave**: 
  - `outside business hours` → denegar para roles no EXEC. 
  - `amount exceeds role limit` → denegar si supera `native_limits`. 
  - `untrusted token` → denegar ERC20 salvo whitelist. 
  - `insufficient pre-approvals for large amount` → denegar si no hay 
confirmaciones mínimas previas. 
 - **Cambios**: 
  - Ajustar límites por fondo/rol en `policy.rego`. 
  - Añadir tokens de confianza en `trusted_tokens`. 
  - Actualizar ventana horaria o excepciones. 
 - **Pruebas**: 
  - Añadir casos en `policy_test.rego`. 
 
 
Cómo usar (resumen operativo) 
1. Crear/validar Safes (owners/threshold) según 
packages/treasury-safe/safe-config.json. 
2. Desplegar el Guard y activarlo en el Safe. 
Levantar OPA (sidecar docker) con packages/treasury-policies montado, ejemplo: 
docker run --rm -p 8181:8181 -v 
"$PWD/packages/treasury-policies:/policies" 
openpolicyagent/opa:latest-rootless run --server --log-level=info 
