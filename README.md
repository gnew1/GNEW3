# GNEW Monorepo — Core Chain & Contracts (N1) 
## Objetivo 
Monorepo base con **Foundry + Hardhat** (dual), **pnpm workspaces**, 
**SDK TS**, CI/CD y estándares de estilo. Incluye emisión y gestión 
del **token GNEW (base)**. 
## Estructura 
apps/ 
packages/ 
├─ contracts/ # Solidity + Hardhat + Foundry + tests + despliegues 
└─ sdk/ # SDK TypeScript (ethers v6) 
## Stack - Node 20 + pnpm - Foundry + Hardhat - Solidity ^0.8.24 + OpenZeppelin ^5.x 
- TypeScript - Commitlint + ESLint + Prettier + Husky 
## Redes - **local** (Anvil) - **Holesky** (ETH) - **Polygon Amoy** (Polygon) - *(Goerli opcional/legacy)* 
## Comandos clave 
```bash 
pnpm i 
anvil -p 8545                                
pnpm contracts:compile 
pnpm test                                    
pnpm contracts:deploy                        
# local 
# hh + forge 
# anvil 
pnpm --filter @gnew/contracts deploy:holesky # Holesky 
pnpm --filter @gnew/contracts deploy:amoy    
# Amoy 
Estándares 
● SPDX + NatSpec en contratos 
● Semver para paquetes (packages/*) 
● Lint/format en pre-commit 
● DoD: CI verde + cobertura ≥90% (pruebas Solidity + HH) 
Seguridad 
● Nunca commitear claves. Usar .env local solo en dev; en CI usar Vault/Secrets. --- 
# Notas de cumplimiento con el prompt 
- **Monorepo (pnpm workspaces)** listo con `apps/` y `packages/`. - **Foundry + Hardhat dual** configurados con scripts uniformes. - **Redes**: local (Anvil), Goerli (legacy), **Holesky**, **Polygon 
Amoy**. - **Estándares**: SPDX, NatSpec, linters, commitlint; semver por 
paquete. - **Pruebas**: `forge test -vvv` + `npx hardhat test` accesibles via 
`pnpm` (objetivo cobertura ≥90%). - **CI/CD**: GitHub Action ejecuta lint, compile, tests HH/Forge, 
coverage. - **Plantillas de PR** incluidas. - **Riesgos & Controles**: `.env.example` + indicaciones de vault; 
husky/commitlint para estilo. - **1.2 Emisión y gestión de token GNEW (base)**: contrato 
`GnewToken.sol` con ERC20 + Permit + Votes + Burnable + Roles 
(minter/pauser), pruebas HH/Forge y scripts de despliegue. --- 
## Arranque rápido (local) 
```bash 
pnpm i 
# Foundry 
forge install foundry-rs/forge-std --no-commit 
# Anvil 
anvil -p 8545 
# Compilar + test 
pnpm contracts:compile 
pnpm test 
# Desplegar en anvil 
export OWNER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 
export INITIAL_SUPPLY=1000000000000000000000000 
pnpm contracts:deploy 
Tras desplegar en Holesky/Amoy, copia la dirección al 
packages/sdk/src/addresses.example.ts (o crea addresses.ts) para 
consumir desde el SDK. 
Si quieres que también añada scripts Foundry de despliegue, solhint, mocks, o un 
ERC20Votes con snapshots, dímelo y lo integro en el mismo estilo. 
Tú dijiste: 
N2 Objetivo: ERC20 gobernanza inicial (puede coexistir luego con el utility). Roles: Eng. Smart 
Contracts (lead), Seguridad, QA. Stack: OZ ERC20 + AccessControl + Pausable; UUPS 
opcional. Entregables: GnewGovToken.sol, scripts deploy/verify, SDK TS con tipos. Pasos: 
Implementar ERC20 con MINTER_ROLE, PAUSER_ROLE. Eventos: Minted, Burned, Paused. 
Módulo “faucet” solo en testnets. Pruebas/DoD: límites de mint, pausas, reverts; gas snapshot. 
Comandos: forge snapshot, forge coverage. Riesgos & Controles: Acuñación indebida → roles 
& multi-sig para minter. 1.3 Registro de transacciones y pruebas 
ChatGPT Plus 
Pensó durante 43s 
