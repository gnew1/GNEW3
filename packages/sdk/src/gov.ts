import { ethers } from "ethers"; 
import type { GnewGovToken } from "@gnew/contracts/typechain-types"; 
import GnewGovTokenAbi from 
"@gnew/contracts/artifacts/src/governance/GnewGovToken.sol/GnewGovToke
 n.json" assert { type: "json" }; 
export type { GnewGovToken } from "@gnew/contracts/typechain-types"; 
export function getGnewGovToken( 
address: string, 
signerOrProvider: ethers.Signer | ethers.Provider 
): GnewGovToken { 
return new ethers.Contract(address, GnewGovTokenAbi.abi, 
signerOrProvider) as unknown as GnewGovToken; 
} 
/packages/sdk/src/addresses.example.ts (añade gov) 
export const GNEW_GOV_TOKEN_ADDRESS: Partial<Record<number, 
`0x${string}`>> = { 
// 17000: "0x...", // Holesky 
// 80002: "0x..."  // Polygon Amoy 
}; 
/packages/contracts/README.md (sección N2) 
## N2 — ERC20 de Gobernanza (coexistente con utility) - Contrato: `src/governance/GnewGovToken.sol` - Roles: `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, `PAUSER_ROLE` - CAP de suministro (`MAX_SUPPLY`), faucet solo testnets 
(Goerli/Holesky/Amoy/Anvil…) - Eventos: `Minted`, `Burned` (+ `Paused/Unpaused` de OZ) - **Opcional UUPS**: `src/governance/GnewGovTokenUUPS.sol` + script 
`deployGovUUPS.ts` 
### Comandos 
```bash 
# Pruebas (Hardhat + Foundry) 
pnpm --filter @gnew/contracts test:hh 
pnpm --filter @gnew/contracts test:forge 
# Cobertura y snapshots de gas 
pnpm --filter @gnew/contracts coverage 
pnpm --filter @gnew/contracts coverage:forge 
pnpm --filter @gnew/contracts snapshot 
# Despliegues 
export OWNER_ADDRESS=0xYourSafeOrEOA 
export TOKEN_NAME="GNEW-GOV" 
export TOKEN_SYMBOL="gGNEW" 
export INITIAL_SUPPLY=100000000000000000000   # 100 gGNEW 
export MAX_SUPPLY=1000000000000000000000      
export FAUCET_AMOUNT=5000000000000000000      
export FAUCET_COOLDOWN=3600                   
# 1,000 gGNEW 
# 5 gGNEW 
# 1h 
pnpm --filter @gnew/contracts deploy:gov 
pnpm --filter @gnew/contracts deploy:gov:holesky 
pnpm --filter @gnew/contracts deploy:gov:amoy 
# UUPS (opcional) 
pnpm --filter @gnew/contracts deploy:gov:uups 
Riesgos & Controles 
● Acuñación indebida: asignar MINTER_ROLE a multi-sig (Gnosis Safe). Mantener 
DEFAULT_ADMIN_ROLE en multi-sig distinta. 
● Pausas de emergencia: PAUSER_ROLE en multi-sig, runbooks para pausar/unpausar. 
● Faucet: limitado por cooldown y amount; bloqueado en mainnets (chainid 1/137). 
/packages/sdk/README.md  *(uso rápido gov)* 
```md 
## SDK — GNEW Governance 
```ts 
import { JsonRpcProvider } from "ethers"; 
import { getGnewGovToken } from "@gnew/sdk/gov"; 
import { GNEW_GOV_TOKEN_ADDRESS } from "@gnew/sdk/addresses"; 
const provider = new JsonRpcProvider(process.env.HOLESKY_RPC_URL!); 
const addr = GNEW_GOV_TOKEN_ADDRESS[17000]!; 
const gov = getGnewGovToken(addr, provider); 
const name = await gov.name(); 
/hardhat.config.ts  *(si usas raíz; si ya está en packages/contracts, 
omite esto)* 
> Ya cubierto en `packages/contracts/hardhat.config.ts`. Se añadió 
`@openzeppelin/hardhat-upgrades` para UUPS. --- 
## Notas de cumplimiento N2 - **ERC20 gobernanza inicial** entregado (`GnewGovToken.sol`) con 
`MINTER_ROLE`, `PAUSER_ROLE`, `Pausable`, **CAP**. - **Eventos**: `Minted`, `Burned`; `Paused/Unpaused` provienen de OZ. - **Faucet testnets**: función `faucet()` habilitada salvo chainId 
1/137; incluye cooldown y amount configurables. - **Pruebas/DoD**: HH + Foundry prueban límites de mint (cap), pausas, 
reverts, faucet y cooldown. Configurado `forge snapshot` y `forge 
coverage`. - **Comandos** listos: `snapshot`, `coverage:forge`, despliegue/verify 
para gov y gov UUPS. - **Riesgos & Controles**: recomendado uso de multi‑sig para roles 
críticos. 
¿Quieres que añada **tests de eventos específicos**, **scripts de 
asignación de roles a un Safe**, o **gas snapshot automatizado en 
CI**? Te lo dejo integrado en el siguiente N. 
 
Tú dijiste: 
N3 Objetivo: Trazabilidad y suite de pruebas unitaria. Roles: Eng. Smart Contracts, QA (lead), 
Data. Stack: Events + The Graph (subgraph) opcional. Entregables: Emisión de 
Transfer/Mint/Burn + pruebas Hardhat/Foundry. Pasos: Modelar eventos necesarios. Pruebas 
de invariantes (Echidna) y unitarias. Pruebas/DoD: 100% paths críticos; property-based para 
saldos. Comandos: echidna-test . Riesgos & Controles: Falta de indización → subgraph + 
alarmas. 1.4 Mecanismo PoS (staking contrato gestor) 
ChatGPT Plus 
Pensó durante 53s 
/packages/contracts/test/events/GnewGovToken.events.spec.ts 
import { expect } from "chai"; 
import { ethers } from "hardhat"; 
import { GnewGovToken } from "../../typechain-types"; 
 
const toWei = (n: string) => ethers.parseUnits(n, 18); 
 
describe("GnewGovToken — eventos (Hardhat)", () => { 
  let gov: GnewGovToken; 
  let owner: any, alice: any; 
 
  beforeEach(async () => { 
    [owner, alice] = await ethers.getSigners(); 
    const F = await ethers.getContractFactory("GnewGovToken"); 
    gov = (await F.deploy( 
      "GNEW-GOV", 
      "gGNEW", 
      owner.address, 
      toWei("100"), 
      toWei("1000"), 
      toWei("5"), 
      3600 
    )) as GnewGovToken; 
    await gov.waitForDeployment(); 
  }); 
 
  it("emite Transfer y Minted al mintear", async () => { 
    await expect(gov.mint(alice.address, toWei("10"))) 
      .to.emit(gov, "Transfer") 
      .withArgs(ethers.ZeroAddress, alice.address, toWei("10")) 
      .and.to.emit(gov, "Minted") 
      .withArgs(alice.address, toWei("10"), owner.address); 
  }); 
 
  it("emite Transfer y Burned al quemar", async () => { 
    await gov.mint(alice.address, toWei("2")); 
    await expect(gov.connect(alice).burn(toWei("1"))) 
      .to.emit(gov, "Transfer") 
      .withArgs(alice.address, ethers.ZeroAddress, toWei("1")) 
      .and.to.emit(gov, "Burned") 
      .withArgs(alice.address, toWei("1"), alice.address); 
  }); 
 
  it("emite Paused/Unpaused y bloquea transferencias", async () => { 
    await expect(gov.pause()).to.emit(gov, 
"Paused").withArgs(owner.address); 
    await expect(gov.transfer(alice.address, 
1)).to.be.revertedWith("paused"); 
    await expect(gov.unpause()).to.emit(gov, 
"Unpaused").withArgs(owner.address); 
  }); 
}); 
 
/packages/contracts/test/events/GnewToken.events.spec.ts 
import { expect } from "chai"; 
import { ethers } from "hardhat"; 
import { GnewToken } from "../../typechain-types"; 
 
const toWei = (n: string) => ethers.parseUnits(n, 18); 
 
describe("GnewToken — eventos (Hardhat)", () => { 
  let token: GnewToken; 
  let owner: any, alice: any; 
 
  beforeEach(async () => { 
    [owner, alice] = await ethers.getSigners(); 
    const F = await ethers.getContractFactory("GnewToken"); 
    token = (await F.deploy("GNEW", "GNEW", owner.address, 
toWei("100"))) as GnewToken; 
    await token.waitForDeployment(); 
  }); 
 
  it("emite Transfer y Minted al mintear (rol)", async () => { 
    await expect(token.mint(alice.address, toWei("3"))) 
      .to.emit(token, "Transfer") 
      .withArgs(ethers.ZeroAddress, alice.address, toWei("3")) 
      .and.to.emit(token, "Minted") 
      .withArgs(alice.address, toWei("3"), owner.address); 
  }); 
 
  it("emite Transfer y Burned al quemar", async () => { 
    await token.mint(alice.address, toWei("2")); 
    await expect(token.connect(alice).burn(toWei("1"))) 
      .to.emit(token, "Transfer") 
      .withArgs(alice.address, ethers.ZeroAddress, toWei("1")) 
      .and.to.emit(token, "Burned") 
      .withArgs(alice.address, toWei("1"), alice.address); 
  }); 
 
  it("emite Paused/Unpaused (OZ) y bloquea transferencias", async () 
=> { 
    await expect(token.pause()).to.emit(token, "Paused"); 
    await expect(token.transfer(alice.address, 
1)).to.be.revertedWith("paused"); 
    await expect(token.unpause()).to.emit(token, "Unpaused"); 
  }); 
}); 
 
/packages/contracts/test/invariants/GnewGovToken.Invariants.t.sol 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import "forge-std/Test.sol"; 
import "forge-std/StdInvariant.sol"; 
import {GnewGovToken} from "../../src/governance/GnewGovToken.sol"; 
 
contract GovHandler { 
    GnewGovToken public gov; 
    address public admin; 
 
    constructor(GnewGovToken _gov) { 
        gov = _gov; 
        admin = msg.sender; 
    } 
 
    function mint(address to, uint256 amt) external { 
        // solo admin tiene MINTER_ROLE en este setup (Test contrata 
como admin) 
        uint256 maxAdd = gov.MAX_SUPPLY() - gov.totalSupply(); 
        if (maxAdd == 0) return; 
        uint256 amount = (amt % maxAdd) + 1; 
        gov.mint(to, amount); 
    } 
 
    function togglePause() external { 
        if (gov.paused()) { 
            gov.unpause(); 
        } else { 
            gov.pause(); 
        } 
    } 
 
    function burn(uint256 amt) external { 
        // intenta quemar del handler (si tiene balance) 
        uint256 bal = gov.balanceOf(address(this)); 
        if (bal == 0) return; 
        uint256 amount = (amt % bal) + 1; 
        gov.burn(amount); 
    } 
 
    function transfer(address to, uint256 amt) external { 
        uint256 bal = gov.balanceOf(address(this)); 
        if (bal == 0) return; 
        uint256 amount = (amt % bal) + 1; 
        // si está pausado, se revertirá y no rompe el invariant 
        try gov.transfer(to, amount) {} catch {} 
    } 
 
    // faucet (si permitido en chain) 
    function faucet() external { 
        try gov.faucet() {} catch {} 
    } 
 
    receive() external payable {} 
} 
 
contract GnewGovToken_Invariants is StdInvariant, Test { 
    GnewGovToken gov; 
    GovHandler handler; 
 
    function setUp() public { 
        gov = new GnewGovToken( 
            "GNEW-GOV", 
            "gGNEW", 
            address(this), 
            100e18, 
            1_000e18, 
            5e18, 
            10 
        ); 
        handler = new GovHandler(gov); 
        // asigna algo de balance al handler para fuzz 
        gov.mint(address(handler), 100e18); 
 
        targetContract(address(handler)); 
    } 
 
    function invariant_CapNotExceeded() public { 
        assertLe(gov.totalSupply(), gov.MAX_SUPPLY()); 
    } 
 
    function invariant_NoTransfersWhenPaused() public { 
        if (gov.paused()) { 
            // intenta una transferencia y verifica que no cambió 
balances 
            uint256 beforeBal = gov.balanceOf(address(handler)); 
            // uso try/catch para evitar revert 
            try handler.transfer(address(0xBEEF), 1 ether) {} catch {} 
            assertEq(gov.balanceOf(address(handler)), beforeBal); 
        } 
    } 
} 
 
/packages/contracts/echidna/GnewGovTokenEchidna.sol 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import {GnewGovToken} from "../src/governance/GnewGovToken.sol"; 
 
/** 
 * @title Harness de Echidna para propiedades de GnewGovToken 
 * Invariantes estilo echidna_* 
 */ 
contract GnewGovTokenEchidna { 
    GnewGovToken internal gov; 
 
    constructor() { 
        // el admin es este contrato para poder pausar/mintear 
        gov = new 
GnewGovToken("GNEW-GOV","gGNEW",address(this),0,1_000_000e18,5e18,1); 
        // dotar fondos al harness para probar burns/transfers 
        gov.mint(address(this), 100e18); 
    } 
 
    // --- acciones fuzzables --- 
 
    function mint_as_admin(address to, uint256 amt) public { 
        uint256 room = gov.MAX_SUPPLY() - gov.totalSupply(); 
        if (room == 0) return; 
        uint256 amount = (amt % room) + 1; 
        gov.mint(to, amount); 
    } 
 
    function pause_unpause() public { 
        if (gov.paused()) gov.unpause(); 
        else gov.pause(); 
    } 
 
    function try_transfer(address to, uint256 amt) public { 
        uint256 bal = gov.balanceOf(address(this)); 
        if (bal == 0) return; 
        uint256 amount = (amt % bal) + 1; 
        // si está pausado, revertirá; evitamos abortar usando call 
        (bool ok, ) = 
address(gov).call(abi.encodeWithSignature("transfer(address,uint256)", 
to, amount)); 
        // ok puede ser false en pausa; no afecta propiedades 
        ok; 
    } 
 
    function try_burn(uint256 amt) public { 
        uint256 bal = gov.balanceOf(address(this)); 
        if (bal == 0) return; 
        uint256 amount = (amt % bal) + 1; 
        (bool ok, ) = 
address(gov).call(abi.encodeWithSignature("burn(uint256)", amount)); 
        ok; 
    } 
 
    // --- invariantes --- 
 
    function echidna_totalSupply_le_cap() public view returns (bool) { 
        return gov.totalSupply() <= gov.MAX_SUPPLY(); 
    } 
 
    function echidna_paused_blocks_transfers() public returns (bool) { 
        // fuerza pausa 
        if (!gov.paused()) gov.pause(); 
        uint256 before = gov.balanceOf(address(this)); 
        (bool ok, ) = 
address(gov).call(abi.encodeWithSignature("transfer(address,uint256)", 
address(0xBEEF), 1)); 
        // despausa para no bloquear siguientes llamadas 
        gov.unpause(); 
        // debe fallar el call y balance no cambia 
        return (!ok) && (gov.balanceOf(address(this)) == before); 
    } 
 
    function echidna_burn_does_not_increase_supply(uint256 x) public 
returns (bool) { 
        uint256 pre = gov.totalSupply(); 
        (bool, ) = 
address(gov).call(abi.encodeWithSignature("burn(uint256)", x)); 
        uint256 post = gov.totalSupply(); 
        return post <= pre; 
    } 
} 
 
/packages/contracts/echidna/echidna.config.yaml 
testMode: "property" 
seqLen: 50 
testLimit: 2000 
shrinkLimit: 2000 
balanceContract: 0 
deployContracts: true 
 
/packages/contracts/package.json (añadir scripts Echidna y Foundry invariants) 
{ 
  "name": "@gnew/contracts", 
  "version": "0.1.2", 
  "private": true, 
  "type": "module", 
  "scripts": { 
    "clean": "rimraf artifacts cache out coverage typechain-types", 
    "compile": "hardhat compile", 
    "build": "hardhat compile && typechain --target ethers-v6 --out-dir typechain-types 
\"./artifacts/@(contracts|src)/**/?(*).json\"", 
    "test:hh": "hardhat test", 
    "test:forge": "forge test -vvv", 
    "coverage": "hardhat coverage", 
    "coverage:forge": "forge coverage --report lcov", 
    "snapshot": "forge snapshot", 
    "echidna": "echidna-test ./echidna/GnewGovTokenEchidna.sol --contract GnewGovTokenEchidna --config ./echidna/echidna.config.yaml" 
  }, 
  "devDependencies": { 
    "@nomicfoundation/hardhat-toolbox": "^5.0.0", 
    "@nomicfoundation/hardhat-verify": "^2.0.0", 
    "@openzeppelin/contracts": "^5.0.2", 
    "@typechain/ethers-v6": "^0.5.1", 
    "@types/chai": "^4.3.16", 
    "@types/mocha": "^10.0.6", 
    "chai": "^4.5.0", 
    "dotenv": "^16.4.5", 
    "ethers": "^6.13.0", 
    "hardhat": "^2.22.12", 
    "hardhat-gas-reporter": "^2.2.2", 
    "rimraf": "^6.0.1", 
    "solidity-coverage": "^0.8.13", 
    "ts-node": "^10.9.2", 
    "typechain": "^8.3.2", 
    "typescript": "^5.5.4" 
  } 
} 
 
/packages/contracts/README.md (sección N3 trazabilidad & pruebas) 
## N3 — Trazabilidad & Suite de Pruebas 
**Eventos modelados** - `Transfer(address from, address to, uint256 value)` (OZ) - `Minted(address to, uint256 amount, address by)` - `Burned(address from, uint256 amount, address by)` - `Paused(address account)` / `Unpaused(address account)` (OZ) 
**Pruebas** - Hardhat: asserts de emisión de eventos en mint/burn/pause 
(`test/events/*.spec.ts`) - Foundry: invariantes 
(`test/invariants/GnewGovToken.Invariants.t.sol`) + unitarias ya 
existentes - Echidna: property-based (`echidna/GnewGovTokenEchidna.sol`) 
**Comandos** 
```bash 
pnpm --filter @gnew/contracts test:hh 
pnpm --filter @gnew/contracts test:forge 
pnpm --filter @gnew/contracts snapshot        
pnpm --filter @gnew/contracts coverage 
pnpm --filter @gnew/contracts coverage:forge 
pnpm --filter @gnew/contracts echidna         
instalado o docker 
# Con Docker: 
# gas snapshot 
# requiere echidna-test 
# docker run --rm -v $PWD/packages/contracts:/src 
trailofbits/eth-security-toolbox \ 
#  bash -lc "cd /src && echidna-test ./echidna/GnewGovTokenEchidna.sol --contract GnewGovTokenEchidna --config ./echidna/echidna.config.yaml" 
Riesgos & Controles 
● Pérdida de trazabilidad por falta de indexado → Subgraph opcional + 
alarmas/health-checks del indexer. 
 
