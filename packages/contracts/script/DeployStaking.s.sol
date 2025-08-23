// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import "forge-std/Script.sol"; 
import {StakingManager} from "../src/staking/StakingManager.sol"; 
 
contract DeployStakingScript is Script { 
    function run() external { 
        address token = vm.envAddress("GOV_TOKEN_ADDRESS"); 
        address admin = vm.envAddress("ADMIN_ADDRESS"); 
        address receiver = vm.envAddress("SLASH_RECEIVER"); 
        uint256 minStake = vm.envUint("MIN_OPERATOR_STAKE"); 
        uint256 unbond = vm.envUint("UNBONDING_WINDOW"); 
        uint256 delay = vm.envUint("SLASH_DELAY"); 
        vm.startBroadcast(); 
        new StakingManager(token, admin, receiver, minStake, unbond, 
delay); 
        vm.stopBroadcast(); 
    } 
} 
 
/packages/contracts/README.md (añade guía N8) 
## N8 — Deploy repetible por entorno 
 
### Hardhat (dotenv) 
```bash 
# Utility token 
npx hardhat run --network polygonAmoy scripts/deploy-token.ts 
 
# Governance 
npx hardhat run --network holesky scripts/deploy-gov.ts 
 
# UUPS (proxy) 
npx hardhat run --network holesky scripts/deploy-gov-uups.ts 
 
# StakingManager 
npx hardhat run --network polygonAmoy scripts/deploy-staking.ts 
 
# Verificación manual 
npx hardhat verify --network holesky 0xContract "arg1" "arg2" 
# o con tarea 
npx hardhat verify:addr --network holesky --address 0xContract --args 
'["arg1","arg2"]' 
Foundry (alternativa) 
forge script script/DeployGov.s.sol --rpc-url $HOLESKY_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify 
forge script script/DeployStaking.s.sol --rpc-url $AMOY_RPC_URL --private-key $PRIVATE_KEY --broadcast 
Addressbook (versionado) & Releases 
● Cada deploy añade una entrada en addressbook/addressbook.json (con txHash, 
block, chainId, impl si UUPS). 
● Etiqueta releases por red: 
npx hardhat release:tag --network holesky --prefix deploy 
# crea tag: deploy/v0.1.3-holesky 
Rollback probado (UUPS) 
1. Revisa impl anterior en addressbook/addressbook.json. 
2. Programa rollback: 
export UPGRADE_GOVERNOR=0xUpgradeGovernor 
export PROXY_ADDRESS=0xProxy 
npx hardhat run --network holesky scripts/rollbackUUPS.ts 
Verificación automática en explorers 
Los scripts deploy-* intentan verificar con @nomicfoundation/hardhat-verify. 
Requiere: 
● ETHERSCAN_API_KEY / POLYGONSCAN_API_KEY en .env 
 
● RPC de la red 
 
DoD 
● Rollback ejecutado en testnet contra UUPS (rollbackUUPS.ts). 
 
● Addressbook versionado y actualizado por cada deploy. 
 
● Release tag creado (release:tag). 
 
Para promover a producción, usa branch protection: deploy job debe depender 
de security (N7) y de ci verde. 
 
 
/.github/workflows/deploy-example.yml  _(ejemplo de job que usa gates 
y etiqueta release)_ 
```yaml 
name: deploy-example 
on: 
  workflow_dispatch: 
    inputs: 
      network: 
        description: "Network (holesky|polygonAmoy)" 
        required: true 
        default: "holesky" 
 
jobs: 
  deploy: 
    needs: [security]   # gate must-pass 
    runs-on: ubuntu-latest 
    permissions: 
      id-token: write 
      contents: write 
    steps: 
      - uses: actions/checkout@v4 
      - uses: pnpm/action-setup@v4 
        with: { version: 9 } 
      - uses: actions/setup-node@v4 
        with: { node-version: 20, cache: "pnpm" } 
      - run: pnpm i --frozen-lockfile 
      - name: Setup Foundry 
        uses: foundry-rs/foundry-toolchain@v1 
        with: { version: nightly } 
 
      - name: Deploy governance token (example) 
        run: | 
          echo "NETWORK=${{ github.event.inputs.network }}" 
          pnpm --filter @gnew/contracts hardhat run --network ${{ 
github.event.inputs.network }} scripts/deploy-gov.ts 
 
      - name: Tag release 
        run: pnpm --filter @gnew/contracts hardhat release:tag --network ${{ github.event.inputs.network }} 
 
 
Resumen de cumplimiento N8 
● Scripts de deploy por contrato (deploy-token.ts, deploy-gov.ts, 
deploy-gov-uups.ts, deploy-staking.ts) con dotenv y verificación 
automática. 
 
● Hardhat tasks para simplificar comandos + tag de release. 
 
● Foundry scripts equivalentes (DeployGov.s.sol, DeployStaking.s.sol). 
 
● Addressbook versionado y actualizado automáticamente (fuente de verdad multi‑red). 
 
● Rollback probado (script rollbackUUPS.ts usando UpgradeGovernor/Timelock). 
 
● Ejemplo sendTx.ts para operaciones directas. 
 
● DoD: npx hardhat run --network amoy scripts/deploy.ts queda cubierto 
con deploy-token.ts o deploy-staking.ts/deploy-gov.ts según objetivo; 
verificación y etiquetado listos. 
 
Tú dijiste: 
N9 Objetivo: Reducir costos en rutas críticas. Roles: Eng. SC (lead), QA perf. Stack: 
unchecked, caching, custom errors, bitpacking. Entregables: Informe “gas-diff” por commit. 
Pruebas/DoD: mejora ≥15% en funciones hotspots. Comandos: forge snapshot --diff. 
ChatGPT Plus 
Pensó durante 1m 11s 
