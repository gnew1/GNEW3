```ts 
import "dotenv/config"; 
import { ethers } from "hardhat"; 
/** Concede un rol arbitrario a una address (uso en incidentes). */ 
async function main() { 
const contract = process.env.CONTRACT!; 
const roleName = process.env.ROLE_NAME!; // e.g., SLASHER_ROLE, 
PAUSER_ROLE 
const grantee = process.env.GRANTEE!; 
if (!contract || !roleName || !grantee) throw new Error("faltan 
ENV"); 
const C = await ethers.getContractAt("StakingManager", contract); 
// intenta obtener selector del rol 
const role = await (C as any)[roleName](); 
const tx = await C.grantRole(role, grantee); 
console.log(`Granted ${roleName} to ${grantee} tx=${(await 
tx.wait())?.hash}`); 
} 
main().catch((e) => (console.error(e), process.exit(1))); 
/packages/contracts/README.md (añade sección N10) 
## N10 — Falla segura y operativa 
**Componentes** 
- `PauseGuardian.sol` — pausa/despausa múltiples contratos en una 
única TX (requiere `PAUSER_ROLE`). - `Errors.sol` — catálogo de *custom errors* uniformes (baratos y 
trazables). 
**Runbooks** - `/runbooks/EMERGENCY-PLAN.md` — políticas, severidades, controles, 
comunicación. - `/runbooks/RUNBOOK-INCIDENTS.md` — procedimientos A–E (reentrancy, 
slashing injusto, faucet abuse, congestión, rollback UUPS). 
**Tareas de pánico (Hardhat)** 
```bash 
# Pausa/Despausa global 
npx hardhat panic:pause-all --network <net> 
npx hardhat panic:unpause-all --network <net> 
# Congelar slasher comprometido 
npx hardhat panic:freeze-slasher --compromised 0xBad --network <net> 
Pruebas/DoD 
● test/emergency/PauseGuardian.spec.ts: simula incidente y demuestra 
recuperación < 15 min (tiempo on‑chain). 
● Validaciones de estado tras re‑apertura. 
/packages/contracts/.env.example  _(añade variables para pánico) 
=== Emergencia / Guardian === 
GUARDIAN_ADDRESS=0xPauseGuardian 
GOV_TOKEN_ADDRESS=0xGov 
UTILITY_TOKEN_ADDRESS= 
STAKING_MANAGER_ADDRESS=0xStaking 
--- 
### Listo para N10 - **Plan de emergencia** y **runbook** operativos con comandos 
concretos. - **PauseGuardian** centraliza pausas atómicas; usa `ReentrancyGuard`. - **Códigos de error** estandarizados (`Errors.sol`) para nuevas 
revisiones. - **Prueba de simulación** que asegura recuperación **< 15 min** 
(on‑chain), cumpliendo el DoD. 
Tú dijiste: 
N11 Objetivo: Mezclar poder por token y reputación on-chain. Roles: Arquitecto de gobernanza 
(lead), Eng. SC, Data, Frontend. Stack: OZ Governor + plugin reputación (soulbound / score 
DID). Entregables: GnewGovernor.sol, ReputationScore.sol. Pasos: ponderación configurable 
(p.ej., 70/30). Pruebas/DoD: propuestas pasan/fracasan como se espera. 
ChatGPT Plus 
Pensó durante 1m 16s 
