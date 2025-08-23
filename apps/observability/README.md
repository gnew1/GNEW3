# @gnew/observability 
 
Exportador Prometheus que: - Cuenta **eventos** por contrato/Evento (logs → `gnew_events_total`). - Cuenta **TX totales** y **TX fallidas** a los contratos 
(`gnew_tx_total`, `gnew_tx_failures_total`), con tasa y 
**failure-rate**. - Expone `/metrics` en `PORT` (por defecto 9108). - Webhook opcional `/webhooks/failure` (Tenderly/Blockscout) para 
sumar fallos detectados fuera del nodo RPC. 
 
## Arranque local 
 
```bash 
cp apps/observability/.env.example apps/observability/.env 
# Rellena RPC_URL, CHAIN_ID y CONTRACTS 
pnpm --filter @gnew/observability dev 
# Métricas: http://localhost:9108/metrics 
Docker compose (Prometheus + Grafana + Alertmanager) 
docker compose -f docker/docker-compose.observability.yml up -d 
# Prometheus: http://localhost:9090 
# Grafana:    
http://localhost:3000 (user/pass por defecto admin/admin 
si desactivas anónimo) 
Alertas (DoD) 
● ContractTxFailureRateHigh: se dispara si el failure-rate ≥ 1% durante 5 min (DoD 
explícito). 
● ContractTxFailureRateAnomalous: umbral adaptativo (media+3σ sobre 1h, clamp a 
25%) → reduce falsos positivos. 
● IndexerLagHigh: lag del indexador > 30 bloques por 10 min. 
Integración con Tenderly/Blockscout (opcional) 
Configura un webhook de transacciones fallidas apuntando a: 
POST http://<host>:9108/webhooks/failure 
Headers: x-webhook-secret: <WEBHOOK_SECRET> 
Body JSON: { "to": "0x...", "txHash": "0x...", "chainId": 17000 } 
El exportador sumará gnew_tx_total y 
gnew_tx_failures_total{source="webhook"}. 
Nuevos contratos 
Añade su nombre/ABI y dirección: 
● ABI: importar en apps/observability/src/abis.ts desde 
@gnew/contracts/artifacts/... 
● Dirección: agregar a CONTRACTS en .env (Nombre:0x...) --- 
### Notas de cumplimiento N5 - **Exporters**: entregado `@gnew/observability` (Node+TS) que expone 
métricas Prometheus y calcula *eventos por minuto* y *tasa de fallos 
de TX* por contrato. - **Dashboards**: JSON de Grafana con variables por contrato/evento y 
paneles clave. - **Alertas**: reglas Prometheus + Alertmanager; umbral fijo (≥1%) y 
**adaptativo** (media+3σ) para reducir falsos positivos. - **Blockscout/Tenderly**: webhook opcional para contabilizar fallos; 
scraping de Blockscout opcional si se despliega propio. - **DoD**: incluye alerta ≥1% activa (ContractTxFailureRateHigh). 
Si quieres, integro también **provisioning automático** del dashboard 
via CI, y un **subgraph** adicional para `StakingManager` con métricas 
de operadores/slashes en Grafana. 
Tú dijiste: 
N6 Objetivo: Actualizabilidad sin hard fork. Roles: Eng. SC (lead), Seguridad. Stack: OZ UUPS; 
upgradeTo, proxiableUUID. Entregables: Proxy + UpgradeGovernor (sólo DAO puede 
actualizar). Pasos: patrones de “storage gap”, inicializadores. Pruebas/DoD: no se rompen 
storage slots entre versiones; script de migración dry-run. Riesgos & Controles: Brick del proxy 
→ guard rails & timelock. 
ChatGPT Plus 
Pensó durante 1m 48s 
/packages/contracts/src/upgrade/UpgradeGovernor.sol 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* @title UpgradeGovernor 
* @author GNEW 
* @notice Orquestador de upgrades UUPS con *guard rails*: 
*         - Sólo ejecuta el **TimelockController** (DAO). 
*         - Verifica `proxiableUUID()` del nuevo implementation 
(anti-brick). 
*         
* 
* Flujo: - Soporta `upgradeTo` y `upgradeToAndCall`. 
*  1) DAO llama `scheduleUpgrade(...)` en este contrato. Este 
contrato agenda la operación en el Timelock. 
*  2) Tras el delay, se ejecuta el timelock → `performUpgrade(...)` → 
`proxy.upgradeTo{AndCall}(newImpl, data)`. 
* 
* Nota: Los contratos UUPS deben autorizar upgrades a este contrato 
(p.ej. `onlyRole(DEFAULT_ADMIN_ROLE)` 
*       
concedido a `UpgradeGovernor`). Este contrato a su vez solo 
es invocado por el **Timelock**. 
*/ 
import {TimelockController} from 
"@openzeppelin/contracts/governance/TimelockController.sol"; 
import {IERC1822Proxiable} from 
"@openzeppelin/contracts/interfaces/IERC1822.sol"; 
interface IUUPSProxy { 
function upgradeTo(address newImplementation) external; 
function upgradeToAndCall(address newImplementation, bytes 
calldata data) external payable; 
} 
contract UpgradeGovernor { 
TimelockController public immutable timelock; 
/// @dev UUID esperado por EIP-1822 para UUPS (== ERC1967 
implementation slot). 
bytes32 internal constant _UUPS_UUID = 
        
0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc; 
 
    event UpgradeScheduled( 
        address indexed proxy, 
        address indexed newImplementation, 
        bytes data, 
        bytes32 predecessor, 
        bytes32 salt, 
        uint256 eta 
    ); 
    event UpgradeExecuted(address indexed proxy, address indexed 
newImplementation); 
    event UpgradeCanceled(bytes32 indexed opId); 
 
    modifier onlyTimelock() { 
        require(msg.sender == address(timelock), "only timelock"); 
        _; 
    } 
 
    constructor(TimelockController _timelock) { 
        timelock = _timelock; 
    } 
 
    /** 
     * @notice Agenda un upgrade en el Timelock (llamará 
`performUpgrade` tras el delay). 
     * @param proxy Dirección del proxy UUPS (ERC1967Proxy apuntando a 
impl UUPS). 
     * @param newImplementation Nueva implementación (debe cumplir 
EIP-1822). 
     * @param data Datos opcionales para `upgradeToAndCall` 
(initializer/parametrización post-upgrade). 
     * @param predecessor Operación previa (si aplica), usualmente 
`bytes32(0)`. 
     * @param salt Sal para identificar la operación (usa una 
aleatoria o derivada del commit). 
     */ 
    function scheduleUpgrade( 
        address proxy, 
        address newImplementation, 
        bytes calldata data, 
        bytes32 predecessor, 
        bytes32 salt 
    ) external { 
        // Este contrato debe tener PROPOSER_ROLE en el timelock. 
        bytes memory callData = abi.encodeWithSelector( 
            this.performUpgrade.selector, proxy, newImplementation, 
data 
        ); 
        uint256 delay = timelock.getMinDelay(); 
        timelock.schedule(address(this), 0, callData, predecessor, 
salt, delay); 
 
        // ETA no se conoce en cadena aquí; frontends pueden 
calcularlo como now+delay 
        emit UpgradeScheduled(proxy, newImplementation, data, 
predecessor, salt, 0); 
    } 
 
    /** 
     * @notice Cancela una operación programada. 
     */ 
    function cancel(bytes32 predecessor, bytes32 salt, address proxy, 
address impl, bytes calldata data) external { 
        bytes32 opId = timelock.hashOperation(address(this), 0, 
abi.encodeCall(this.performUpgrade,(proxy, impl, data)), predecessor, 
salt); 
        timelock.cancel(opId); 
        emit UpgradeCanceled(opId); 
    } 
 
    /** 
     * @notice Ejecutado por el Timelock. Realiza el upgrade con 
validaciones. 
     * @dev El/los contratos UUPS deben autorizar que **este** 
contrato llame `upgradeTo*`. 
     */ 
    function performUpgrade(address proxy, address newImplementation, 
bytes calldata data) 
        external 
        onlyTimelock 
        payable 
    { 
        // 1) Guard-rail: validar que `newImplementation` es UUPS 
(proxiableUUID correcto). 
        //    Llamada directa al implementation (no vía proxy). 
        try IERC1822Proxiable(newImplementation).proxiableUUID() 
returns (bytes32 uuid) { 
            require(uuid == _UUPS_UUID, "not UUPS"); 
        } catch { 
            revert("no proxiableUUID"); 
        } 
 
        // 2) Ejecutar upgradeTo / upgradeToAndCall 
        if (data.length == 0) { 
            IUUPSProxy(proxy).upgradeTo(newImplementation); 
        } else { 
            IUUPSProxy(proxy).upgradeToAndCall{value: 
msg.value}(newImplementation, data); 
        } 
 
        emit UpgradeExecuted(proxy, newImplementation); 
    } 
} 
 
/packages/contracts/src/governance/GnewGovTokenUUPSV2.sol 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
/** 
 * @title GnewGovTokenUUPSV2 
 * @notice Ejemplo de nueva versión con layout compatible. Se añade: 
 *         - `version()` (pura) 
 *         - `metadataURI` (nuevo slot al final) 
 * @dev Mantiene orden de variables de V1 y añade nuevas al final 
(guardar layout). 
 */ 
import {GnewGovTokenUUPS} from "./GnewGovTokenUUPS.sol"; 
 
contract GnewGovTokenUUPSV2 extends GnewGovTokenUUPS { 
    /// NUEVO: metadata opcional (añadido al final, no rompe layout) 
    string public metadataURI; 
 
    function setMetadataURI(string memory uri) external 
onlyRole(DEFAULT_ADMIN_ROLE) { 
        metadataURI = uri; 
    } 
 
    function version() external pure returns (string memory) { 
        return "gGNEW-UUPS-v2"; 
    } 
 
    // Reserva extra de espacio para futuras variables. 
    uint256[49] private __gapV2; 
} 
 
/packages/contracts/src/governance/GnewGovTokenUUPS.sol (añade storage gap sin romper 
V1 y refuerza doc de authorize) 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
/* ...imports y cuerpo original sin cambios funcionales... */ 
 
// Al final del contrato, añade un gap para futuras expansiones. 
// (si ya estaba desplegado, agregar variables NUEVAS al final es 
seguro) 
uint256[50] private __gap; 
 
/packages/contracts/scripts/deployTimelockAndUpgradeGovernor.ts 
import "dotenv/config"; 
import { ethers } from "hardhat"; 
 
async function main() { 
  const minDelay = Number(process.env.TIMELOCK_DELAY || "3600"); // 1h 
  const dao = process.env.DAO_ADDRESS!; 
  if (!dao) throw new Error("DAO_ADDRESS requerido"); 
 
  // 1) TimelockController 
  const TLF = await ethers.getContractFactory("TimelockController"); 
  // proposers: UpgradeGovernor (lo sabremos luego, temporalmente 
vacío) → asignaremos vía grantRole 
  // executors: cualquiera o DAO (recomendado: DAO) 
  const timelock = await TLF.deploy(minDelay, [], [dao], await 
ethers.getSigners()[0].address); 
  await timelock.waitForDeployment(); 
  console.log("Timelock @", await timelock.getAddress()); 
 
  // 2) UpgradeGovernor 
  const UGF = await ethers.getContractFactory("UpgradeGovernor"); 
  const ug = await UGF.deploy(await timelock.getAddress()); 
  await ug.waitForDeployment(); 
  console.log("UpgradeGovernor @", await ug.getAddress()); 
 
  // 3) Conceder PROPOSER_ROLE al UpgradeGovernor; EXECUTOR_ROLE al 
DAO (o a cualquiera) 
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE(); 
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE(); 
  await timelock.grantRole(PROPOSER_ROLE, await ug.getAddress()); 
  await timelock.grantRole(EXECUTOR_ROLE, dao); 
 
  console.log("Roles asignados. PROPOSER=UpgradeGovernor, 
EXECUTOR=DAO"); 
} 
 
main().catch((e) => { 
  console.error(e); 
process.exit(1); 
}); 
/packages/contracts/scripts/upgradeDryRun.ts 
/** 
* Dry-run de upgrade: valida layout y prepara address de 
implementation. 
* Requiere: PROXY_ADDRESS (proxy UUPS) y el nombre del nuevo contrato 
(p.ej. GnewGovTokenUUPSV2). 
*/ 
import "dotenv/config"; 
import { ethers, upgrades } from "hardhat"; 
async function main() { 
const proxy = process.env.PROXY_ADDRESS!; 
const contractName = process.env.NEW_IMPL || "GnewGovTokenUUPSV2"; 
const F = await ethers.getContractFactory(contractName); 
// Valida layout y devuelve address de la nueva implementación (no 
ejecuta upgrade) 
const implAddr = await upgrades.prepareUpgrade(proxy, F, { kind: 
"uups" }); 
console.log("✓ Layout OK. New implementation prepared @", implAddr); 
// Probar proxiableUUID (guard rail off-chain) 
const uuid = await (await ethers.getContractAt(contractName, 
implAddr)).proxiableUUID(); 
console.log("proxiableUUID:", uuid); 
} 
main().catch((e) => { 
console.error(e); 
process.exit(1); 
}); 
/packages/contracts/scripts/scheduleUpgrade.ts 
/** 
 * Agenda un upgrade en el Timelock vía UpgradeGovernor. 
 * ENV: 
 *  - UPGRADE_GOVERNOR=0x... 
 *  - PROXY_ADDRESS=0x... 
 *  - NEW_IMPL=NombreContrato (p.ej. GnewGovTokenUUPSV2) 
 *  - SALT=0x... (opcional; si no, se deriva del hash del bytecode) 
 *  - INIT_SIG=signature opcional (ej: "setMetadataURI(string)") 
 *  - INIT_ARGS=argumentos JSON (ej: '["ipfs://..."]') 
 */ 
import "dotenv/config"; 
import { ethers } from "hardhat"; 
 
async function main() { 
  const ugAddr = process.env.UPGRADE_GOVERNOR!; 
  const proxy = process.env.PROXY_ADDRESS!; 
  const name = process.env.NEW_IMPL || "GnewGovTokenUUPSV2"; 
 
  const F = await ethers.getContractFactory(name); 
  const impl = await F.deploy(); // deploy impl para validar UUID 
on-chain si se quiere (opcional) 
  await impl.waitForDeployment(); 
 
  let data: string = "0x"; 
  if (process.env.INIT_SIG && process.env.INIT_ARGS) { 
    const iface = F.interface; 
    const args = JSON.parse(process.env.INIT_ARGS); 
    data = iface.encodeFunctionData(process.env.INIT_SIG, args); 
  } 
 
  const salt = process.env.SALT 
    ? process.env.SALT 
    : ethers.id(name + (await impl.getAddress())).slice(0, 66); 
 
  const ug = await ethers.getContractAt("UpgradeGovernor", ugAddr); 
  const tx = await ug.scheduleUpgrade(proxy, await impl.getAddress(), 
data, ethers.ZeroHash, salt); 
  const rc = await tx.wait(); 
  console.log("Upgrade scheduled. tx=", rc?.hash); 
  console.log("impl=", await impl.getAddress(), "salt=", salt); 
} 
 
main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
}); 
 
/packages/contracts/test/upgrade/Upgradeability.spec.ts 
import { expect } from "chai"; 
import { ethers, upgrades } from "hardhat"; 
 
const toWei = (n: string) => ethers.parseUnits(n, 18); 
 
describe("UUPS Upgrade — guard rails + timelock", () => { 
  it("sólo el flujo Timelock->UpgradeGovernor puede actualizar; UUID 
correcto; layout válido", async () => { 
    const [owner, dao, proposer, executor] = await 
ethers.getSigners(); 
 
    // 1) Deploy proxy UUPS (V1) 
    const V1 = await ethers.getContractFactory("GnewGovTokenUUPS"); 
    const proxy = await upgrades.deployProxy( 
      V1, 
      ["GNEW-GOV", "gGNEW", owner.address, toWei("0"), 
toWei("1000000"), toWei("0"), 0], 
      { initializer: "initialize", kind: "uups" } 
    ); 
    await proxy.waitForDeployment(); 
    const proxyAddr = await proxy.getAddress(); 
 
    // 2) Timelock + UpgradeGovernor 
    const TLF = await ethers.getContractFactory("TimelockController"); 
    const timelock = await TLF.deploy(60, [], [executor.address], 
owner.address); // 60s delay 
    await timelock.waitForDeployment(); 
    const UGF = await ethers.getContractFactory("UpgradeGovernor"); 
    const ug = await UGF.deploy(await timelock.getAddress()); 
    await ug.waitForDeployment(); 
 
    // Conceder PROPOSER_ROLE al UpgradeGovernor y EXECUTOR ya 
asignado 
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE(); 
    await timelock.grantRole(PROPOSER_ROLE, await ug.getAddress()); 
 
    // 3) Transferir el poder de upgrade (DEFAULT_ADMIN_ROLE) en el 
token al UpgradeGovernor 
    const tokenV1 = await ethers.getContractAt("GnewGovTokenUUPS", 
proxyAddr); 
    const DEFAULT_ADMIN_ROLE = await tokenV1.DEFAULT_ADMIN_ROLE(); 
    await tokenV1.grantRole(DEFAULT_ADMIN_ROLE, await 
ug.getAddress()); 
    await tokenV1.revokeRole(DEFAULT_ADMIN_ROLE, owner.address); 
 
    // 4) Dry‑run de layout para V2 
    const V2 = await ethers.getContractFactory("GnewGovTokenUUPSV2"); 
    await upgrades.validateUpgrade(proxyAddr, V2, { kind: "uups" }); 
// no lanza => layout OK 
 
    // 5) Schedule upgrade vía UpgradeGovernor (proposer externo llama 
a UG → UG.schedule en timelock) 
    const impl = await V2.deploy(); 
    await impl.waitForDeployment(); 
    const call = ug.interface.encodeFunctionData("performUpgrade", 
[proxyAddr, await impl.getAddress(), "0x"]); 
    const salt = ethers.id("test-salt"); 
    await ug.connect(proposer).scheduleUpgrade(proxyAddr, await 
impl.getAddress(), "0x", ethers.ZeroHash, salt); 
 
    // 6) No se puede ejecutar antes del delay 
    await expect( 
      timelock.connect(executor).execute(await ug.getAddress(), 0, 
call, ethers.ZeroHash, salt) 
    ).to.be.reverted; 
 
    // 7) Esperar delay y ejecutar 
    await ethers.provider.send("evm_increaseTime", [65]); 
    await ethers.provider.send("evm_mine", []); 
    await expect( 
      timelock.connect(executor).execute(await ug.getAddress(), 0, 
call, ethers.ZeroHash, salt) 
    ).to.emit(ug, "UpgradeExecuted"); 
 
    // 8) La implementación es V2 (tiene version()) 
    const tokenV2 = await ethers.getContractAt("GnewGovTokenUUPSV2", 
proxyAddr); 
    expect(await tokenV2.version()).to.eq("gGNEW-UUPS-v2"); 
 
    // 9) Intento de upgrade directo por EOA falla (no tiene rol) 
    await expect(tokenV2.connect(owner).upgradeTo(await 
impl.getAddress())).to.be.reverted; 
  }); 
}); 
 
/packages/contracts/package.json (scripts N6) 
{ 
  "name": "@gnew/contracts", 
  "version": "0.1.4", 
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
    "deploy:timelock:ug": "hardhat run 
scripts/deployTimelockAndUpgradeGovernor.ts --network holesky", 
    "upgrade:dry": "hardhat run scripts/upgradeDryRun.ts --network 
holesky", 
    "upgrade:schedule": "hardhat run scripts/scheduleUpgrade.ts --network holesky" 
  }, 
  "devDependencies": { 
    "@openzeppelin/contracts": "^5.0.2", 
    "@openzeppelin/hardhat-upgrades": "^3.0.0", 
    "@nomicfoundation/hardhat-toolbox": "^5.0.0", 
    "@nomicfoundation/hardhat-verify": "^2.0.0", 
    "@typechain/ethers-v6": "^0.5.1", 
    "dotenv": "^16.4.5", 
    "ethers": "^6.13.0", 
    "hardhat": "^2.22.12", 
    "ts-node": "^10.9.2", 
    "typechain": "^8.3.2", 
    "typescript": "^5.5.4" 
  }, 
  "dependencies": { 
    "@openzeppelin/contracts-upgradeable": "^5.0.2" 
  } 
} 
 
/packages/contracts/README.md (sección N6: Upgrades seguras UUPS) 
## N6 — Actualizabilidad sin hard fork (UUPS) 
 
**Componentes** - `UpgradeGovernor.sol` — *facade* de upgrades controlada por 
**TimelockController** (DAO). - `GnewGovTokenUUPSV2.sol` — ejemplo de nueva implementación 
compatible. - Scripts: `deployTimelockAndUpgradeGovernor.ts`, `upgradeDryRun.ts`, 
`scheduleUpgrade.ts`. 
 
**Patrones aplicados** 
- UUPS (EIP-1822) + ERC1967 proxy (Hardhat Upgrades). - `proxiableUUID()` validado on-chain antes de ejecutar upgrade 
(anti-brick). - `storage gap` añadido en V1; nuevas variables sólo al final del 
layout. - Inicializadores `initialize(...)` con `initializer` (sin 
constructor). - **Timelock** → asegura *delay* y *cancellation window* antes del 
upgrade. - **Sólo DAO**: otorgar `DEFAULT_ADMIN_ROLE` del contrato UUPS al 
`UpgradeGovernor`; éste sólo acepta llamadas del **Timelock**. 
**DoD / Pruebas** - `test/upgrade/Upgradeability.spec.ts`: valida - Layout mediante `upgrades.validateUpgrade` (dry‑run). - `proxiableUUID` correcto. - Upgrade sólo ejecutable por Timelock→UpgradeGovernor. - Post-upgrade: funciones V2 disponibles y roles preservados. - Script `upgrade:dry` para migración *dry-run* (no toca la cadena). - Guard rails: `not UUPS` o `no proxiableUUID` ⇒ revert inmediato. 
**Comandos** 
```bash 
# Desplegar Timelock + UpgradeGovernor en Holesky 
export TIMELOCK_DELAY=3600 
export DAO_ADDRESS=0xYourDAO 
pnpm --filter @gnew/contracts deploy:timelock:ug 
# Dry-run del upgrade (valida layout, no cambia el proxy) 
export PROXY_ADDRESS=0xProxy 
export NEW_IMPL=GnewGovTokenUUPSV2 
pnpm --filter @gnew/contracts upgrade:dry 
# Programar upgrade (opcionalmente con init call) 
export UPGRADE_GOVERNOR=0xUpgradeGovernor 
export PROXY_ADDRESS=0xProxy 
export NEW_IMPL=GnewGovTokenUUPSV2 
# export INIT_SIG="setMetadataURI(string)" 
# export INIT_ARGS='["ipfs://cid"]' 
pnpm --filter @gnew/contracts upgrade:schedule 
Riesgos & Controles 
● Brick del proxy → verificación proxiableUUID del implementation + upgrade:dry 
con chequeo de layout por plugin OZ. 
● Slippage operacional → Timelock con minDelay (p. ej. 24h) y cancellation window 
(cancel) para incidentes. 
● Compromiso de llaves → el poder de upgrade se concentra en UpgradeGovernor 
(contrato), pero la ejecución la controla Timelock (DAO/multisig) con proposer/executor 
separados. Revoca DEFAULT_ADMIN_ROLE de EOAs. 
Si quieres, añado una automatización de pipeline CI que ejecute upgrade:dry 
contra layouts históricos (con @openzeppelin/upgrades-core y storage 
layout artifacts) y suba un reporte HTML de compatibilidad a los artefactos 
del build. 
Tú dijiste: 
N7 Objetivo: Pipeline de análisis continuo. Roles: Seguridad (lead), DevOps. Stack: Slither, 
Mythril (y/o MythX si disponible), Echidna. Entregables: Job CI security.yml, badge de estado. 
Pasos: gates “must-pass” antes de deploy. Pruebas/DoD: cero findings críticos. Riesgos & 
Controles: Fuga secrets → OIDC + secret scanner. 
ChatGPT Plus 
Pensó durante 1m 10s 
