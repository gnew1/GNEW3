# Seguridad — GNEW 
// ya cubierto por linters - **CI Security Gates**: Slither (estático), Mythril (symbolic), 
Echidna (property-based), Secret scan (Gitleaks). - **Política de Deploy**: *must-pass* para `security` antes de 
cualquier despliegue a testnets/mainnet. - **OIDC**: se usa `permissions: id-token: write` para autenticación 
federada si se integra con proveedores cloud (sin secrets). - **Reportes**: Slither sube **SARIF** a Code Scanning. Incidentes 
críticos → abrir issue con etiqueta `security`. 
> Objetivo DoD: **0 findings críticos**. Cualquier hallazgo 
`High/Medium` bloquea el pipeline. 
/README.md (añade badge y gates de deploy) 
# GNEW Monorepo — Core Chain & Contracts 
<!-- Badge de estado (seguridad) --> 
[![Security 
CI](https://github.com/<OWNER>/<REPO>/actions/workflows/security.yml/b
 adge.svg)](https://github.com/<OWNER>/<REPO>/actions/workflows/securit
 y.yml) 
## Gates de seguridad (N7) - Pipeline `security` ejecuta **Slither**, **Mythril**, **Echidna** y 
**Gitleaks**. - **Must‑pass antes de deploy**: asegúrate que cualquier job de 
despliegue declare `needs: [security]` o que el branch `main` requiera 
el check `security / gate`. 
/.github/workflows/ci.yml (parche mínimo para “gates must-pass”) 
# Añade al job de deploy (si existe) la dependencia del gate de 
seguridad: 
# jobs: 
#   deploy: 
#     
needs: [build-test, security]   # ← obliga a pasar seguridad 
#     
#     
#       
runs-on: ubuntu-latest 
steps: 
... 
Cómo funciona (resumen rápido) 
● Slither: análisis estático con SARIF (aparece en Code scanning alerts). El job falla si 
hay findings High (y Medium por la configuración de fail-on: high + política DoD 
“cero críticos”; puedes cambiar a critical si deseas). 
● Mythril: ejecuta análisis simbólico sobre StakingManager.sol y 
GnewGovToken.sol. El pipeline falla si hay High/Medium en el JSON de resultados. 
● Echidna: property-based sobre el harness ya incluido en 
packages/contracts/echidna/. Si alguna propiedad echidna_* falla, el job 
revienta. 
● Secret scanner: Gitleaks recorre todo el repositorio (histórico incluido) para prevenir 
fuga de secrets, acorde al riesgo declarado; puedes integrar push protection con 
branch protection rules. 
DoD N7 (cumplido) 
● Job CI security.yml listo con Slither + Mythril + Echidna + secret scanning, subida 
de SARIF, OIDC habilitado. 
● Badge de estado entregado (.github/badges/SECURITY_BADGE.md + snippet en 
README). 
● Gates “must‑pass”: ejemplo de dependencia needs: [security] para bloquear 
deploys hasta pasar seguridad. 
● Umbral de calidad: DoD “cero críticos” aplicado; los jobs fallan si aparecen hallazgos 
graves. 
● Riesgos & Controles: Fuga de secrets mitigado con Gitleaks; credenciales via OIDC 
(sin secretos persistentes). 
¿Quieres que también publique los resultados de Slither/Mythril como artefactos HTML, o que 
integre CodeQL para dataflow adicional? 
Tú dijiste: 
N8 Objetivo: Deploy repetible por entorno. Roles: DevOps (lead), Eng. SC. Stack: Hardhat 
tasks, Foundry scripts, dotenv. Entregables: scripts/deploy-*.ts, ejemplos sendTx.ts. Pasos: 
verificar en explorers, etiquetar releases. Pruebas/DoD: rollback probado; addressbook 
versiónado. Comandos: npx hardhat run --network amoy scripts/deploy.ts. 
ChatGPT Plus 
Pensó durante 19s 
