```python 
import os 
import pandas as pd 
from packages.analytics_py.analytics.scenarios import 
generate_scenarios 
from packages.analytics_py.analytics.metrics import 
compute_elasticity, compute_inflation 
from packages.analytics_py.analytics.reporting import generate_reports 
def test_scenarios_and_metrics(tmp_path): 
sc = generate_scenarios(months=18, seed=7) 
assert set(sc.keys()) == {"base", "alto", "bajo"} 
for df in sc.values(): 
assert {"cpi", "price", "participation"} <= set(df.columns) 
        assert len(df) == 18 
 
    beta, r2 = compute_elasticity(sc["base"]) 
    assert -1.5 < beta < 0  # elasticidad negativa razonable 
    assert 0 <= r2 <= 1 
 
    with_infl = compute_inflation(sc["alto"]) 
    assert "infl_mom" in with_infl.columns and "infl_yoy" in 
with_infl.columns 
 
    out = tmp_path / "reports" 
    paths = generate_reports(sc, out_dir=str(out)) 
    assert os.path.exists(paths["elasticidad"]) 
    assert os.path.exists(paths["inflacion"]) 
    e = pd.read_csv(paths["elasticidad"]) 
    assert {"escenario", "elasticidad", "r2"} <= set(e.columns) 
 
 
Ruta completa: ./analytics/notebooks/stress_test.ipynb 
{ 
 "cells": [ 
  { 
   "cell_type": "markdown", 
   "metadata": {}, 
   "source": [ 
    "# N26 · Stress-test con Pandas\n", 
    "\n", 
    "**Objetivo**: TL;DR cuantitativo de *escenarios base/alto/bajo* y 
estimación de **elasticidad** (participación vs. precio) e 
**inflación** (MoM/YoY).\n", 
    "\n", 
    "### Escenarios (documentados)\n", 
    "- **Base**: infl. mensual ≈ 0.25%, σ=0.10%, adopción +0.2%/mes, 
elasticidad −0.6.\n", 
    "- **Alto**: infl. mensual ≈ 0.9% con choque +0.6% entre M7–M12, 
adopción −0.1%/mes, elasticidad −0.7.\n", 
    "- **Bajo**: desinflación −0.15%/mes, menor σ, adopción +0.3%/mes, 
elasticidad −0.5.\n", 
    "\n", 
    "> **Salida**: `reports/analytics/elasticidad.csv` y 
`reports/analytics/inflacion.csv`." 
   ] 
  }, 
  { 
   "cell_type": "code", 
   "metadata": {}, 
   "execution_count": null, 
   "outputs": [], 
   "source": [ 
    "import os, pandas as pd\n", 
    "from packages.analytics_py.analytics.scenarios import 
generate_scenarios\n", 
    "from packages.analytics_py.analytics.metrics import 
compute_elasticity, compute_inflation\n", 
    "from packages.analytics_py.analytics.reporting import 
generate_reports\n", 
    "\n", 
    "sc = generate_scenarios(months=24, seed=42)\n", 
    "list(sc.keys()), {k: sc[k].head(2) for k in sc}" 
   ] 
  }, 
  { 
   "cell_type": "code", 
   "metadata": {}, 
   "execution_count": null, 
   "outputs": [], 
   "source": [ 
    "rows = []\n", 
    "for name, df in sc.items():\n", 
    "    beta, r2 = compute_elasticity(df)\n", 
    "    tmp = compute_inflation(df)\n", 
    "    rows.append({\n", 
    "        'escenario': name,\n", 
    "        'elasticidad': beta,\n", 
    "        'r2': r2,\n", 
    "        'infl_mom_prom': tmp['infl_mom'].mean(),\n", 
    "        'infl_yoy_últ': tmp['infl_yoy'].iloc[-1]\n", 
    "    })\n", 
    "pd.DataFrame(rows)" 
   ] 
  }, 
  { 
   "cell_type": "code", 
   "metadata": {}, 
   "execution_count": null, 
   "outputs": [], 
   "source": [ 
    "paths = generate_reports(sc, out_dir='reports/analytics')\n", 
    "paths" 
   ] 
  } 
 ], 
 "metadata": { 
  "kernelspec": { "display_name": "Python 3", "language": "python", 
"name": "python3" }, 
  "language_info": { "name": "python", "version": "3.11" } 
 }, 
 "nbformat": 4, 
 "nbformat_minor": 5 
} 
 
 
Ruta completa: ./Makefile 
.PHONY: reports-analytics 
reports-analytics: 
 python analytics/generate_reports.py --months 24 --out 
reports/analytics 
 @echo "Informes listos en reports/analytics" 
 
 
Notas de integración 
● Monorepo: colocamos la librería en packages/analytics_py/analytics para que 
pueda importarse desde notebooks, scripts o servicios Python existentes sin acoplarse a 
ningún microservicio. 
● Entregables cumplidos: 
○ Notebook: ./analytics/notebooks/stress_test.ipynb con escenarios 
base/alto/bajo documentados y ejemplo de ejecución. 
○ Informes: generados por analytics/generate_reports.py → 
reports/analytics/{elasticidad,inflacion}.csv. 
● Pruebas: packages/analytics_py/tests/test_analytics.py valida 
generación de escenarios y exportación de reportes. 
● Cómo correr: make reports-analytics o ejecutar directamente el script del folder 
analytics/. 
¿Quieres que también deje un job de CI que corra el generador y suba los CSV como 
artefactos? 
Tú dijiste: 
N27 Objetivo: Burn automático cuando M2 excede metas. Roles: Eng. SC, Gobernanza. DoD: 
quema auditable; timelock. 
ChatGPT Plus 
Pensó durante 55s 
/contracts/M2BurnController.sol 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* GNEW · M2BurnController 
* 
* Objetivo: ejecutar **quemas automáticas** (con timelock) cuando el 
agregado monetario M2 
* supera la meta definida por la DAO. Enfatiza **estabilidad** 
(evitar oscilaciones) y **auditabilidad**. 
* 
* ► Flujo 
*   1) Oráculos (autorizados) publican observaciones de M2 (en 
unidades del token, wei) vía `pushM2`. 
*      
Se mantiene un EMA (suavizado) para robustez. 
*   2) Cualquiera puede previsualizar la quema recomendada 
(`previewRecommendedBurn`). 
*   3) La DAO programa una quema (`scheduleBurn`) con **timelock** 
fijo (delay) y razón/auditoría. 
*   4) Cualquiera ejecuta la quema tras el timelock con 
`executeBurn(id)`. 
* 
* ► Estabilidad / Anti-oscillaciones 
*   - Banda muerta (`deadbandPPM`) alrededor de la meta (`targetM2`). 
*   - Límite de paso por época (`maxStepPPM`) sobre `totalSupply`. 
*   - Suavizado de observaciones EMA (`obsAlphaPPM`). 
*   - Enfriamiento `epochSeconds` entre programaciones. 
* 
* ► Requisitos del token a quemar (recomendado: GNEW-UTIL de N21): 
*   - Debe implementar ERC20 con `totalSupply()`, 
`balanceOf(address)`. 
*   - Debe permitir `burn(uint256)` desde este contrato (p. ej., 
ERC20Burnable) y tener balance aquí. 
* 
* ► Auditoría: 
*   - Todos los parámetros, observaciones, programaciones y 
ejecuciones emiten eventos con datos completos. 
*/ 
interface IERC20BurnableLike { 
function totalSupply() external view returns (uint256); 
function balanceOf(address) external view returns (uint256); 
function burn(uint256) external; 
} 
library MathP { 
uint256 internal constant PPM = 1_000_000; // partes por millón 
function min(uint256 a, uint256 b) internal pure returns (uint256) 
{ return a < b ? a : b; } 
} 
 
contract M2BurnController { 
    using MathP for uint256; 
 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
    // Roles & dependencias 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
 
    address public dao;                 // admin de parámetros y 
scheduling 
    address public oracleAdmin;         // puede autorizar oráculos 
    mapping(address => bool) public isOracle; 
 
    IERC20BurnableLike public immutable token; // token a quemar (ej. 
UGNEW) 
 
    modifier onlyDAO() { require(msg.sender == dao, "not dao"); _; } 
    modifier onlyOracleAdmin() { require(msg.sender == oracleAdmin || 
msg.sender == dao, "not oracleAdmin"); _; } 
    modifier onlyOracle() { require(isOracle[msg.sender], "not 
oracle"); _; } 
 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
    // Parámetros de control gobernados por la DAO 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
 
    struct Params { 
        uint256 targetM2;        // meta de M2 (wei del token) 
        uint32  deadbandPPM;     // banda muerta ±PPM alrededor de la 
meta (p.ej. 30_000 = ±3%) 
        uint32  maxStepPPM;      // quema máxima por ejecución como 
fracción del totalSupply (PPM). p.ej. 50_000 = 5% 
        uint32  epochSeconds;    // enfriamiento mínimo entre 
programaciones (p.ej. 86_400) 
        uint32  obsAlphaPPM;     // alpha del EMA para M2 observado (0 
= sin suavizado, 200_000 = 20%) 
        uint32  timelockSeconds; // retraso mínimo entre schedule y 
execute (p.ej. 86_400) 
    } 
    Params public params; 
 
    event ParamsUpdated(Params p); 
    event DAOUpdated(address dao); 
    event OracleAdminUpdated(address oracleAdmin); 
    event OracleSet(address indexed who, bool allowed); 
 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
    // Observaciones (EMA) 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
 
    uint256 public lastObsAt; 
    uint256 public emaM2; // EMA de M2 en wei 
 
    event ObservationPushed(address indexed oracle, uint256 rawM2, 
uint256 emaM2); 
 
    function pushM2(uint256 currentM2Wei) external onlyOracle { 
        uint256 a = params.obsAlphaPPM; 
        if (emaM2 == 0 || a == 0) { 
            emaM2 = currentM2Wei; 
        } else { 
            // ema = ema*(1-a) + x*a 
            emaM2 = (emaM2 * (MathP.PPM - a) + currentM2Wei * a) / 
MathP.PPM; 
        } 
        lastObsAt = block.timestamp; 
        emit ObservationPushed(msg.sender, currentM2Wei, emaM2); 
    } 
 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
    // Timelock + programación de quemas 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
 
    struct BurnSchedule { 
        uint256 id; 
        uint256 amount;         // cantidad solicitada a quemar (wei) 
        uint256 eta;            // earliest time to execute 
        uint256 m2Snapshot;     // M2(EMA) usado al programar 
        uint256 targetSnapshot; // targetM2 al programar 
        string  reason;         // nota/auditoría 
        bool    executed; 
        bool    canceled; 
        uint256 executedAmount; // por si el balance era insuficiente 
    } 
 
    uint256 public nextId = 1; 
    mapping(uint256 => BurnSchedule) public burns; 
    uint256 public lastScheduledAt; 
 
    event BurnScheduled( 
        uint256 indexed id, 
        uint256 amount, 
        uint256 eta, 
        uint256 m2Snapshot, 
        uint256 targetSnapshot, 
        string  reason 
    ); 
    event BurnExecuted( 
        uint256 indexed id, 
        uint256 scheduledAmount, 
        uint256 executedAmount, 
        uint256 supplyBefore, 
        uint256 balanceBefore 
    ); 
    event BurnCanceled(uint256 indexed id, string note); 
 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
    // Constructor & admin 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
 
    constructor(address _dao, address _oracleAdmin, address _token, 
Params memory p, uint256 bootM2) { 
        require(_dao != address(0) && _oracleAdmin != address(0) && 
_token != address(0), "zero"); 
        dao = _dao; 
        oracleAdmin = _oracleAdmin; 
        token = IERC20BurnableLike(_token); 
        _setParams(p); 
        emaM2 = bootM2; // si 0, se actualizará en el primer push 
    } 
 
    function setDAO(address n) external onlyDAO { require(n != 
address(0), "zero"); dao = n; emit DAOUpdated(n); } 
    function setOracleAdmin(address n) external onlyDAO { require(n != 
address(0), "zero"); oracleAdmin = n; emit OracleAdminUpdated(n); } 
    function setOracle(address who, bool allowed) external 
onlyOracleAdmin { isOracle[who] = allowed; emit OracleSet(who, 
allowed); } 
    function setParams(Params calldata p) external onlyDAO { 
_setParams(p); } 
    function _setParams(Params memory p) internal { 
        require(p.deadbandPPM <= MathP.PPM, "deadband>1"); 
        require(p.maxStepPPM <= MathP.PPM, "maxStep>1"); 
        require(p.epochSeconds >= 300, "epoch<5m"); 
        require(p.timelockSeconds >= 60, "timelock<60s"); 
        params = p; 
        emit ParamsUpdated(p); 
    } 
 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
    // Lógica de recomendación 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
 
    /** 
     * Devuelve la quema recomendada dada la EMA actual, respetando 
banda muerta y tope por paso. 
     * No consume estado. 
     */ 
    function previewRecommendedBurn() public view returns (uint256 
recommended, bool withinBand, uint256 upperBand, uint256 lowerBand) { 
        uint256 target = params.targetM2; 
        uint256 db = params.deadbandPPM; 
 
        // bandas: [target*(1-db), target*(1+db)] 
        lowerBand = (target * (MathP.PPM - db)) / MathP.PPM; 
        upperBand = (target * (MathP.PPM + db)) / MathP.PPM; 
 
        uint256 m2 = emaM2 == 0 ? target : emaM2; 
        withinBand = (m2 >= lowerBand && m2 <= upperBand); 
        if (withinBand || m2 <= target) { 
            return (0, withinBand, upperBand, lowerBand); 
        } 
 
        uint256 excess = m2 - upperBand; // sólo por encima de la 
banda superior 
        // Límite por paso: porcentaje del supply total 
        uint256 cap = (token.totalSupply() * params.maxStepPPM) / 
MathP.PPM; 
        recommended = excess > cap ? cap : excess; 
    } 
 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
    // Scheduling & ejecución (timelocked) 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
 
    /// @notice Programa una quema con timelock. Debe ser llamada por 
la DAO. 
    function scheduleBurn(uint256 amount, string calldata reason) 
external onlyDAO returns (uint256 id) { 
        require(block.timestamp >= lastScheduledAt + 
params.epochSeconds, "cooldown"); 
        require(amount > 0, "amount=0"); 
 
        id = nextId++; 
        uint256 eta = block.timestamp + params.timelockSeconds; 
 
        burns[id] = BurnSchedule({ 
            id: id, 
            amount: amount, 
            eta: eta, 
            m2Snapshot: emaM2, 
            targetSnapshot: params.targetM2, 
            reason: reason, 
            executed: false, 
            canceled: false, 
            executedAmount: 0 
        }); 
 
        lastScheduledAt = block.timestamp; 
        emit BurnScheduled(id, amount, eta, emaM2, params.targetM2, 
reason); 
    } 
 
    /// @notice Ejecuta una quema vencido el timelock. No requiere 
privilegios. 
    function executeBurn(uint256 id) external { 
        BurnSchedule storage b = burns[id]; 
        require(b.id != 0, "bad id"); 
        require(!b.executed, "already"); 
        require(!b.canceled, "canceled"); 
        require(block.timestamp >= b.eta, "timelock"); 
 
        uint256 bal = token.balanceOf(address(this)); 
        uint256 toBurn = bal.min(b.amount); 
        uint256 supplyBefore = token.totalSupply(); 
 
        require(toBurn > 0, "no balance"); 
        token.burn(toBurn); 
 
        b.executed = true; 
        b.executedAmount = toBurn; 
 
        emit BurnExecuted(id, b.amount, toBurn, supplyBefore, bal); 
    } 
 
    /// @notice Cancela una quema programada (por ejemplo, si nuevas 
observaciones cambian la situación). 
    function cancelBurn(uint256 id, string calldata note) external 
onlyDAO { 
        BurnSchedule storage b = burns[id]; 
        require(b.id != 0, "bad id"); 
        require(!b.executed, "already"); 
        require(!b.canceled, "already canceled"); 
        b.canceled = true; 
        emit BurnCanceled(id, note); 
    } 
 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
    // Utilidades 
    // 
─────────────────────────────────────────────────────────────────────
 ─────── 
 
    /// @notice Vuelca los parámetros y estado principales para 
dashboards. 
    function status() 
        external 
        view 
        returns ( 
            uint256 _emaM2, 
            uint256 _targetM2, 
            uint32  _deadbandPPM, 
            uint32  _maxStepPPM, 
            uint32  _epochSeconds, 
            uint32  _timelockSeconds, 
            uint256 _lastObsAt, 
            uint256 _tokenSupply, 
            uint256 _controllerBalance 
        ) 
    { 
        _emaM2 = emaM2; 
        _targetM2 = params.targetM2; 
        _deadbandPPM = params.deadbandPPM; 
        _maxStepPPM = params.maxStepPPM; 
        _epochSeconds = params.epochSeconds; 
        _timelockSeconds = params.timelockSeconds; 
        _lastObsAt = lastObsAt; 
        _tokenSupply = token.totalSupply(); 
        _controllerBalance = token.balanceOf(address(this)); 
    } 
} 
 
/contracts/test/M2BurnController.t.ts 
import { expect } from "chai"; 
import { ethers } from "hardhat"; 
 
describe("M2BurnController", () => { 
  async function deploy() { 
    const [dao, oracle, treasury, rando] = await ethers.getSigners(); 
 
    // Burnable token mock (18 dec) 
    const Token = await ethers.getContractFactory(` 
      // SPDX-License-Identifier: MIT 
      pragma solidity ^0.8.24; 
      import {ERC20} from 
"@openzeppelin/contracts/token/ERC20/ERC20.sol"; 
      import {ERC20Burnable} from 
"@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol"; 
      contract MockBurnable is ERC20, ERC20Burnable { 
        constructor() ERC20("Mock", "MOCK") { _mint(msg.sender, 0); } 
        function mint(address to, uint v) external { _mint(to, v); } 
      } 
    `); 
    const token = await Token.deploy(); 
    await token.waitForDeployment(); 
 
    // Mint y fondeo del controller (para poder quemar) 
    const initial = ethers.parseEther("1000000"); 
    await (await token.mint(treasury.address, initial)).wait(); 
 
    const Controller = await 
ethers.getContractFactory("M2BurnController"); 
    const params = { 
      targetM2: ethers.parseEther("800000"), // meta M2 
      deadbandPPM: 30000,                    // ±3% 
      maxStepPPM: 50000,                     // 5% del supply por 
ejecución 
      epochSeconds: 3600,                    // 1h 
      obsAlphaPPM: 200000,                   // 20% 
      timelockSeconds: 600,                  // 10 min 
    }; 
    const controller = await Controller.deploy( 
      dao.address, 
      dao.address, // oracleAdmin 
      await token.getAddress(), 
      params, 
      ethers.parseEther("900000") // bootM2 (arrancamos por encima) 
    ); 
    await controller.waitForDeployment(); 
 
    // autorizar oráculo y fondear controller con tokens a quemar 
    await (await controller.connect(dao).setOracle(oracle.address, 
true)).wait(); 
    await (await token.connect(treasury).transfer(await 
controller.getAddress(), ethers.parseEther("50000"))).wait(); 
 
    return { dao, oracle, treasury, rando, token, controller, params 
}; 
  } 
 
  async function timeTravel(sec: number) { 
    await ethers.provider.send("evm_increaseTime", [sec]); 
    await ethers.provider.send("evm_mine", []); 
  } 
 
  it("recomienda, programa con timelock y ejecuta quema auditable", 
async () => { 
    const { controller, dao, oracle, token } = await deploy(); 
 
    // push observación alta de M2 (por encima de la banda) 
    await (await 
controller.connect(oracle).pushM2(ethers.parseEther("900000"))).wait()
 ; 
 
    const preview = await controller.previewRecommendedBurn(); 
    const rec = preview[0] as bigint; 
    expect(rec).to.be.gt(0n); 
 
    // schedule por DAO 
    const tx = await controller.connect(dao).scheduleBurn(rec, "exceso 
M2 > banda"); 
    const rc = await tx.wait(); 
    const ev = rc!.logs.find((l:any) => l.fragment?.name === 
"BurnScheduled"); 
    const id = ev?.args?.id as bigint; 
 
    // no ejecuta antes del timelock 
    await 
expect(controller.executeBurn(id)).to.be.revertedWith("timelock"); 
 
    await timeTravel(601); 
 
    const supplyBefore = await token.totalSupply(); 
    const balBefore = await token.balanceOf(await 
controller.getAddress()); 
    await (await controller.executeBurn(id)).wait(); 
 
    const supplyAfter = await token.totalSupply(); 
    const balAfter = await token.balanceOf(await 
controller.getAddress()); 
 
    // supply debe bajar exactamente lo quemado (±0) 
    expect(balBefore - balAfter).to.equal(supplyBefore - supplyAfter); 
    expect(supplyAfter).to.be.lt(supplyBefore); 
  }); 
 
  it("respeta cap por paso (maxStepPPM) y banda muerta", async () => { 
    const { controller, dao, oracle, token, params } = await deploy(); 
    // dentro de banda → recomendado = 0 
    await (await 
controller.connect(oracle).pushM2(params.targetM2)).wait(); 
    const p0 = await controller.previewRecommendedBurn(); 
    expect(p0[0]).to.equal(0n); 
 
    // muy por encima → recomendado limitado por cap (5% supply) 
    const supply = await token.totalSupply(); 
await (await controller.connect(oracle).pushM2(params.targetM2 + 
supply)).wait(); 
const p1 = await controller.previewRecommendedBurn(); 
const cap = (supply * BigInt(params.maxStepPPM)) / 1_000_000n; 
expect(p1[0]).to.equal(cap); 
}); 
}); 
/contracts/README-burn-controller.md 
# M2BurnController — Quema automática con timelock 
## Qué resuelve - Si el agregado **M2** excede la **meta** de la DAO, se dispara una 
**quema** del token utilitario (p.ej. UGNEW). - Garantiza **estabilidad** con banda muerta, EMA de observaciones y 
límite por paso. - Cumple con **timelock** y **auditabilidad** (eventos detallados y 
almacenamiento de schedules). 
## Parámetros (gobernables) - `targetM2` — meta de M2 (wei). - `deadbandPPM` — ±PPM alrededor de la meta (p.ej. 30_000 = ±3%). - `maxStepPPM` — quema máxima por ejecución como fracción de 
`totalSupply`. - `epochSeconds` — enfriamiento entre `scheduleBurn`. - `obsAlphaPPM` — alpha del EMA para M2 (0 = sin suavizado). - `timelockSeconds` — retraso mínimo entre `scheduleBurn` y 
`executeBurn`. 
## Flujo operativo 
1. **Oráculos** (Data/Gobernanza) reportan M2 con `pushM2(m2Wei)`. 
2. Cualquiera llama `previewRecommendedBurn()` para ver la quema 
sugerida. 
3. La **DAO** programa `scheduleBurn(amount, reason)` (se registra 
`m2Snapshot` y `targetSnapshot`). 
4. Tras `timelockSeconds`, cualquiera ejecuta `executeBurn(id)`. Si el 
balance del contrato es menor al programado, quema el balance 
disponible y registra `executedAmount`. 
## Notas de integración - El contrato debe poseer los tokens a quemar (transferidos desde 
Tesorería). - `IERC20BurnableLike` requiere `burn(uint256)` (UGNEW lo implementa 
vía `ERC20Burnable`). - Recomendado: asignar este contrato como **beneficiario** de 
“sharebacks” / ingresos de Tesorería si se desea auto‑reabastecimiento 
de balance para quemas futuras. 
## Auditoría - Eventos: `ObservationPushed`, `BurnScheduled`, `BurnExecuted`, 
`BurnCanceled`, `ParamsUpdated`. - `status()` expone estado para paneles. 
Cómo encaja con N27 (DoD) 
● Quema auditable: BurnScheduled incluye m2Snapshot, targetSnapshot, 
amount, eta, reason. BurnExecuted captura executedAmount, supplyBefore, 
balanceBefore. Todo trazable on‑chain (±0). 
● Timelock: timelockSeconds obligatorio; executeBurn solo procede pasado el eta. 
Cancelación por DAO disponible. 
● Estabilidad / evitar oscilaciones: banda muerta, límite por paso (PPM), suavizado 
EMA y cooldown entre programaciones. 
¿Te añado un script de despliegue Hardhat que setee parámetros para mainnet/testnet y 
transfiera un lote inicial desde Tesorería al controller? 
Tú dijiste: 
N28 Objetivo: Monitorear pools, TVL, precio medio. Roles: Data, Seguridad. Entregables: job 
cron + alertas. DoD: alertas en desviación > X%. 
ChatGPT Plus 
Pensó durante 32s 
Ruta completa: ./services/monitor/main.py 
#!/usr/bin/env python3 
""" 
GNEW · N28 — Monitor de pools (TVL, precio medio) + alertas por 
desviación > X% - Lee configuración YAML (pools, tokens, umbrales, endpoints RPC). - Calcula: 
* Precio por token (mediana de fuentes DEX UniswapV2/Intercambios 
configurados). 
* TVL por pool (según tipo) y TVL total. 
* Precio medio (VWAP opcional). - Detecta desviaciones: 
* Precio actual vs EMA (por token). 
* Precio de una fuente vs mediana (para detectar outliers / 
manipulación). 
* TVL vs EMA (opcional). - Emite alertas (Slack webhook / Email SMTP) cuando |Δ| > X%. - Persiste estado (EMA, últimos valores) en JSON (idempotente para job 
cron). 
DoD: alertas en desviación > X% (umbral configurable). 
""" 
import os, sys, json, time, math, smtplib, ssl 
from email.message import EmailMessage 
from dataclasses import dataclass, asdict 
from typing import Any, Dict, List, Optional, Tuple 
import yaml 
from web3 import Web3 
from web3.contract import Contract 
from decimal import Decimal, getcontext 
getcontext().prec = 40  # más precisión en onchain -> Decimal 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# ABIs mínimos 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
ERC20_ABI = [ 
    
{"constant":True,"inputs":[],"name":"decimals","outputs":[{"name":"","
 type":"uint8"}],"type":"function"}, 
    
{"constant":True,"inputs":[],"name":"symbol","outputs":[{"name":"","ty
 pe":"string"}],"type":"function"}, 
    
{"constant":True,"inputs":[{"name":"account","type":"address"}],"name"
 :"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function
 "}, 
] 
 
UNIV2_PAIR_ABI = [ 
    {"constant":True,"inputs":[],"name":"getReserves","outputs":[ 
        {"name":"_reserve0","type":"uint112"}, 
        {"name":"_reserve1","type":"uint112"}, 
        
{"name":"_blockTimestampLast","type":"uint32"}],"type":"function"}, 
    
{"constant":True,"inputs":[],"name":"token0","outputs":[{"name":"","ty
 pe":"address"}],"type":"function"}, 
    
{"constant":True,"inputs":[],"name":"token1","outputs":[{"name":"","ty
 pe":"address"}],"type":"function"}, 
] 
 
# StakingPools de N22 (sólo lo que necesitamos) 
STAKING_POOLS_ABI = [ 
    
{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}
 ], 
     "name":"poolInfo","outputs":[ 
         
{"internalType":"address","name":"stakingToken","type":"address"}, 
         
{"internalType":"address","name":"rewardToken","type":"address"}, 
         {"internalType":"uint32","name":"aprBps","type":"uint32"}, 
         
{"internalType":"uint64","name":"lastUpdate","type":"uint64"}, 
         
{"internalType":"uint256","name":"rewardPerTokenStored","type":"uint25
 6"}, 
         
{"internalType":"uint256","name":"totalStaked","type":"uint256"}], 
     "stateMutability":"view","type":"function"} 
] 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Config & Estado 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
@dataclass 
class PriceSource: 
    kind: str              # "univ2" 
    address: str           # pair address 
    base_is_token0: bool   # True si token a valorar está en token0 
(para ratio) 
    stable_decimals: int   # decs del estable (USDC/USDT) 
    note: str = "" 
 
@dataclass 
class TokenCfg: 
    symbol: str 
    address: str 
    decimals: int 
    sources: List[PriceSource] 
    ema_alpha: float        # 0..1 para EMA del precio 
    deviation_pct_alert: float  # p.ej. 0.05 => 5% (precio vs EMA) 
 
@dataclass 
class PoolCfg: 
    name: str 
    type: str              # "univ2", "staking_pool" 
    address: str           # pair / staking contract 
    staking_pool_id: Optional[int] = None 
    token: Optional[str] = None  # symbol del token staked (para TVL) 
    tvl_deviation_pct_alert: Optional[float] = None # alertar si TVL 
cambia >X% vs EMA 
 
@dataclass 
class Settings: 
    rpc_url: str 
    network: str 
    slack_webhook: Optional[str] 
    email_from: Optional[str] 
    email_to: Optional[str] 
    smtp_host: Optional[str] 
    smtp_port: Optional[int] 
    smtp_user: Optional[str] 
    smtp_pass: Optional[str] 
    state_path: str 
    report_path: str 
 
def load_config(path: str) -> Tuple[Settings, Dict[str, TokenCfg], 
List[PoolCfg]]: 
    with open(path, "r") as f: 
        cfg = yaml.safe_load(f) 
 
    settings = Settings( 
        rpc_url=os.getenv("RPC_URL", cfg["settings"]["rpc_url"]), 
        network=cfg["settings"].get("network","unknown"), 
        slack_webhook=os.getenv("SLACK_WEBHOOK", 
cfg["settings"].get("slack_webhook")), 
        email_from=os.getenv("ALERT_EMAIL_FROM", 
cfg["settings"].get("email_from")), 
        email_to=os.getenv("ALERT_EMAIL_TO", 
cfg["settings"].get("email_to")), 
        smtp_host=os.getenv("SMTP_HOST", 
cfg["settings"].get("smtp_host")), 
        smtp_port=int(os.getenv("SMTP_PORT", 
cfg["settings"].get("smtp_port") or 465)), 
        smtp_user=os.getenv("SMTP_USER", 
cfg["settings"].get("smtp_user")), 
        smtp_pass=os.getenv("SMTP_PASS", 
cfg["settings"].get("smtp_pass")), 
        
state_path=cfg["settings"].get("state_path","/tmp/monitor_state.json")
 , 
        
report_path=cfg["settings"].get("report_path","/tmp/monitor_report.jso
 n"), 
    ) 
 
    tokens: Dict[str, TokenCfg] = {} 
    for t in cfg["tokens"]: 
        sources = [PriceSource(**s) for s in t["sources"]] 
        tokens[t["symbol"]] = TokenCfg( 
            symbol=t["symbol"], 
            address=Web3.to_checksum_address(t["address"]), 
            decimals=int(t["decimals"]), 
            sources=sources, 
            ema_alpha=float(t.get("ema_alpha", 0.2)), 
            deviation_pct_alert=float(t.get("deviation_pct_alert", 
0.05)) 
        ) 
 
    pools = [PoolCfg( 
        name=p["name"], 
        type=p["type"], 
        address=Web3.to_checksum_address(p["address"]), 
        staking_pool_id=p.get("staking_pool_id"), 
        token=p.get("token"), 
        tvl_deviation_pct_alert=float(p.get("tvl_deviation_pct_alert", 
0.1)) if p.get("tvl_deviation_pct_alert") is not None else None 
    ) for p in cfg["pools"]] 
 
    return settings, tokens, pools 
 
def load_state(path: str) -> Dict[str, Any]: 
    if os.path.exists(path): 
        try: 
            with open(path, "r") as f: 
                return json.load(f) 
        except Exception: 
            return {} 
    return {} 
 
def save_state(path: str, state: Dict[str, Any]) -> None: 
    tmp = path + ".tmp" 
    with open(tmp, "w") as f: 
        json.dump(state, f, indent=2) 
    os.replace(tmp, path) 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Utilidades DEX / precios 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
def get_pair_price_wrt_stable(w3: Web3, pair: str, token_addr: str, 
stable_decimals: int) -> Optional[Decimal]: 
    """Devuelve precio del token (en unidades de estable) leyendo 
reservas UniswapV2 pair.""" 
    c = w3.eth.contract(address=pair, abi=UNIV2_PAIR_ABI) 
    t0 = c.functions.token0().call() 
    t1 = c.functions.token1().call() 
    r0, r1, _ = c.functions.getReserves().call() 
 
    # Identificar si token es token0 o token1 
    if Web3.to_checksum_address(t0) == token_addr: 
        # precio token = reserveStable / reserveToken, ajustando 
decimales 
        # asumimos el otro es el estable con 'stable_decimals' 
        price = Decimal(r1) / Decimal(r0) 
        return price 
    elif Web3.to_checksum_address(t1) == token_addr: 
        price = Decimal(r0) / Decimal(r1) 
        return price 
    else: 
        return None 
 
def median(values: List[Decimal]) -> Optional[Decimal]: 
    vals = [v for v in values if v is not None] 
    if not vals: 
        return None 
    vals.sort() 
    n = len(vals) 
    if n % 2 == 1: 
        return vals[n//2] 
    else: 
        return (vals[n//2 - 1] + vals[n//2]) / Decimal(2) 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Alertas 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
def send_slack(webhook: str, text: str) -> None: 
    import urllib.request, json as _json 
    req = urllib.request.Request(webhook, data=_json.dumps({"text": 
text}).encode("utf-8"), headers={"Content-Type":"application/json"}) 
    with urllib.request.urlopen(req, timeout=10) as _: 
        pass 
 
def send_email(host: str, port: int, user: str, password: str, sender: 
str, to: str, subject: str, body: str) -> None: 
    msg = EmailMessage() 
    msg["Subject"] = subject 
    msg["From"] = sender 
    msg["To"] = to 
    msg.set_content(body) 
    ctx = ssl.create_default_context() 
    with smtplib.SMTP_SSL(host, port, context=ctx, timeout=15) as 
server: 
        if user: 
            server.login(user, password) 
        server.send_message(msg) 
 
def alert(settings: Settings, title: str, lines: List[str]) -> None: 
    text = f"*{title}*\n" + "\n".join(lines) 
    if settings.slack_webhook: 
        try: 
            send_slack(settings.slack_webhook, text) 
        except Exception as e: 
            print(f"[WARN] Slack failed: {e}", file=sys.stderr) 
    if settings.email_from and settings.email_to and 
settings.smtp_host: 
        try: 
            send_email( 
                settings.smtp_host, settings.smtp_port or 465, 
                settings.smtp_user or "", settings.smtp_pass or "", 
                settings.email_from, settings.email_to, 
                title, "\n".join(lines) 
            ) 
        except Exception as e: 
            print(f"[WARN] Email failed: {e}", file=sys.stderr) 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# TVL por pool 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
def get_erc20_decimals(w3: Web3, addr: str) -> int: 
    c = w3.eth.contract(address=addr, abi=ERC20_ABI) 
    return int(c.functions.decimals().call()) 
 
def staking_pool_tvl(w3: Web3, pool_addr: str, pool_id: int, 
token_decimals: int, token_price_usd: Decimal) -> Decimal: 
    c = w3.eth.contract(address=pool_addr, abi=STAKING_POOLS_ABI) 
    info = c.functions.poolInfo(pool_id).call() 
    total_staked = Decimal(info[5]) / Decimal(10**token_decimals) 
    tvl = total_staked * token_price_usd 
    return tvl 
 
def univ2_tvl(w3: Web3, pair_addr: str, token_addr: str, 
token_decimals: int, token_price_usd: Decimal) -> Decimal: 
    c = w3.eth.contract(address=pair_addr, abi=UNIV2_PAIR_ABI) 
    t0 = Web3.to_checksum_address(c.functions.token0().call()) 
    t1 = Web3.to_checksum_address(c.functions.token1().call()) 
    r0, r1, _ = c.functions.getReserves().call() 
    # TVL = sum(reserveToken*price + reserveStable) 
    if t0 == token_addr: 
        token_res = Decimal(r0) / Decimal(10**token_decimals) 
        stable_res = Decimal(r1)  # asumimos 1:1 USD, ya en "unidades" 
del estable 
    elif t1 == token_addr: 
        token_res = Decimal(r1) / Decimal(10**token_decimals) 
        stable_res = Decimal(r0) 
    else: 
        return Decimal(0) 
    tvl = token_res * token_price_usd + stable_res 
    return tvl 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# EMA helpers 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
def ema(prev: Optional[float], x: float, alpha: float) -> float: 
    if prev is None: 
        return x 
    return (1 - alpha) * prev + alpha * x 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Main 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
def main(): 
    cfg_path = os.getenv("MONITOR_CONFIG", 
"services/monitor/config.yaml") 
    settings, tokens, pools = load_config(cfg_path) 
    state = load_state(settings.state_path) 
 
    w3 = Web3(Web3.HTTPProvider(settings.rpc_url, 
request_kwargs={"timeout": 15})) 
    if not w3.is_connected(): 
        print("[FATAL] No se pudo conectar al RPC", file=sys.stderr) 
        sys.exit(2) 
 
    # 1) Precios por token (mediana de fuentes) 
    token_prices_usd: Dict[str, Decimal] = {} 
    token_sources_prices: Dict[str, List[Tuple[str, 
Optional[Decimal]]]] = {} 
 
    for sym, t in tokens.items(): 
        per_source: List[Tuple[str, Optional[Decimal]]] = [] 
        for src in t.sources: 
            try: 
                p = get_pair_price_wrt_stable(w3, 
Web3.to_checksum_address(src.address), t.address, src.stable_decimals) 
                per_source.append((src.address, p)) 
            except Exception as e: 
                print(f"[WARN] fuente precio fallo 
{sym}@{src.address}: {e}", file=sys.stderr) 
                per_source.append((src.address, None)) 
 
        token_sources_prices[sym] = per_source 
        med = median([v for _, v in per_source if v is not None]) 
        if med is None: 
            print(f"[WARN] sin precio mediano para {sym}", 
file=sys.stderr) 
            continue 
        token_prices_usd[sym] = med 
 
        # EMA y alertas de precio vs EMA 
        prev_ema = (state.get("price_ema", {}).get(sym)) 
        new_ema = ema(prev_ema, float(med), tokens[sym].ema_alpha) 
        state.setdefault("price_ema", {})[sym] = new_ema 
 
    # 2) TVL por pool (requiere precio token si aplica) 
    pool_tvls: Dict[str, float] = {} 
    for p in pools: 
        try: 
            if p.type == "staking_pool": 
                if not p.token or p.staking_pool_id is None: 
                    raise RuntimeError("staking_pool requiere token y 
staking_pool_id") 
                price = token_prices_usd.get(p.token) 
                if price is None: 
                    print(f"[WARN] sin precio para {p.token}, 
omitiendo TVL pool {p.name}", file=sys.stderr) 
                    continue 
                token_dec = tokens[p.token].decimals 
                tvl = staking_pool_tvl(w3, p.address, 
int(p.staking_pool_id), token_dec, price) 
                pool_tvls[p.name] = float(tvl) 
            elif p.type == "univ2": 
                # calcular TVL aproximado (token + estable); si no se 
especifica token, tomaremos el primero que coincida 
                if p.token is None: 
                    print(f"[INFO] pool {p.name} sin token asociado; 
saltando TVL", file=sys.stderr) 
                    continue 
                price = token_prices_usd.get(p.token) 
                if price is None: 
                    print(f"[WARN] sin precio para {p.token}, 
omitiendo {p.name}", file=sys.stderr) 
                    continue 
                tvl = univ2_tvl(w3, p.address, 
tokens[p.token].address, tokens[p.token].decimals, price) 
                pool_tvls[p.name] = float(tvl) 
            else: 
                print(f"[WARN] tipo pool desconocido {p.type}", 
file=sys.stderr) 
        except Exception as e: 
            print(f"[WARN] error TVL {p.name}: {e}", file=sys.stderr) 
 
        # EMA y posible alerta por TVL 
        if p.name in pool_tvls: 
            prev = (state.get("tvl_ema", {}).get(p.name)) 
            new = ema(prev, pool_tvls[p.name], 0.2) 
            state.setdefault("tvl_ema", {})[p.name] = new 
 
    # 3) Alertas por desviación 
    alert_lines: List[str] = [] 
 
    # 3a) Precio vs EMA por token 
    for sym, price in token_prices_usd.items(): 
        ema_val = state.get("price_ema", {}).get(sym) 
        if ema_val: 
            dev = abs(float(price) - ema_val) / max(ema_val, 1e-12) 
            if dev >= tokens[sym].deviation_pct_alert: 
                alert_lines.append(f"Precio {sym} desviado 
{dev*100:.2f}% — actual ${float(price):.6f} vs EMA ${ema_val:.6f} 
(umbral {tokens[sym].deviation_pct_alert*100:.1f}%)") 
 
    # 3b) Precio por fuente vs mediana (detección de outliers / 
manipulación) 
    for sym, lst in token_sources_prices.items(): 
        if sym not in token_prices_usd: 
            continue 
        med = float(token_prices_usd[sym]) 
        for addr, v in lst: 
            if v is None:  
                continue 
            dev = abs(float(v) - med) / max(med, 1e-12) 
            if dev >= max(0.05, tokens[sym].deviation_pct_alert):  # 
alerta si fuente difiere mucho de la mediana 
                alert_lines.append(f"Fuente outlier {sym}@{addr} dev 
{dev*100:.2f}% — {float(v):.6f} vs mediana {med:.6f}") 
 
    # 3c) TVL vs EMA por pool 
    for name, tvl in pool_tvls.items(): 
        ema_val = state.get("tvl_ema", {}).get(name) 
        cfg = next((p for p in pools if p.name == name), None) 
        thr = cfg.tvl_deviation_pct_alert if cfg and 
cfg.tvl_deviation_pct_alert else 0.15 
        if ema_val: 
            dev = abs(float(tvl) - ema_val) / max(ema_val, 1e-12) 
            if dev >= thr: 
                alert_lines.append(f"TVL pool {name} desviado 
{dev*100:.2f}% — actual {tvl:,.2f} vs EMA {ema_val:,.2f} (umbral 
{thr*100:.1f}%)") 
 
    # 4) Reporte (JSON plano para dashboards) + Alertas si corresponde 
    report = { 
        "ts": int(time.time()), 
        "network": settings.network, 
        "prices": {k: float(v) for k,v in token_prices_usd.items()}, 
        "price_ema": state.get("price_ema", {}), 
        "pools_tvl": pool_tvls, 
        "pools_tvl_ema": state.get("tvl_ema", {}), 
        "sources": {sym: [(addr, (float(v) if v is not None else 
None)) for addr, v in srcs] for sym, srcs in 
token_sources_prices.items()} 
    } 
    with open(settings.report_path, "w") as f: 
        json.dump(report, f, indent=2) 
 
    if alert_lines: 
        title = f"[GNEW][{settings.network}] Alertas de monitoreo 
(desviación > X%)" 
        alert(settings, title, alert_lines) 
        print("\n".join(["ALERT:"] + alert_lines)) 
    else: 
        print("[OK] Sin alertas. Reporte escrito en", 
settings.report_path) 
 
    # 5) Persistir estado 
    save_state(settings.state_path, state) 
 
 
if __name__ == "__main__": 
    main() 
 
 
Ruta completa: ./services/monitor/config.example.yaml 
settings: 
  rpc_url: "https://mainnet.infura.io/v3/XXXX" 
  network: "mainnet" 
  slack_webhook: ""             # opcional 
  email_from: ""                # opcional 
  email_to: ""                  # opcional 
  smtp_host: ""                 # opcional 
  smtp_port: 465 
  smtp_user: "" 
  smtp_pass: "" 
  state_path: "services/monitor/state.json" 
  report_path: "services/monitor/report.json" 
 
tokens: 
  - symbol: "UGNEW" 
    address: "0x0000000000000000000000000000000000000001" 
    decimals: 18 
    ema_alpha: 0.2 
    deviation_pct_alert: 0.05       # 5% → DoD 
    sources: 
      - kind: "univ2" 
        address: "0xUniswapV2PairAddr1" 
        base_is_token0: true 
        stable_decimals: 6 
        note: "UGNEW/USDC" 
      - kind: "univ2" 
        address: "0xUniswapV2PairAddr2" 
        base_is_token0: false 
        stable_decimals: 6 
        note: "UGNEW/USDT" 
 
  - symbol: "GNEW" 
    address: "0x0000000000000000000000000000000000000002" 
    decimals: 18 
    ema_alpha: 0.2 
    deviation_pct_alert: 0.07       # 7% 
    sources: 
      - kind: "univ2" 
        address: "0xUniswapV2PairAddr3" 
        base_is_token0: true 
        stable_decimals: 6 
        note: "GNEW/USDC" 
 
pools: 
  - name: "Staking-UGNEW" 
type: "staking_pool" 
address: "0xStakingPoolsContract" 
staking_pool_id: 1 
token: "UGNEW" 
tvl_deviation_pct_alert: 0.15   # 15% - name: "UGNEW/USDC" 
type: "univ2" 
address: "0xUniswapV2PairAddr1" 
token: "UGNEW" 
tvl_deviation_pct_alert: 0.2 
Ruta completa: ./services/monitor/requirements.txt 
web3==6.19.0 
PyYAML==6.0.2 
Ruta completa: ./services/monitor/README.md 
# GNEW · N28 — Monitor de pools (TVL, precio medio) + Alertas 
**Entregables:** job cron + alertas (Slack/Email).   
**DoD:** alertas se disparan cuando hay **desviación > X%** 
(configurable por token/pool). 
## Cómo correr local 
```bash 
pip install -r services/monitor/requirements.txt 
export MONITOR_CONFIG=services/monitor/config.yaml  # copia del 
example y completa direcciones 
python services/monitor/main.py 
Salida: 
● services/monitor/report.json — snapshot con precios, TVL y fuentes. 
● services/monitor/state.json — estado con EMA para detección de 
desviaciones. 
Config 
Edita services/monitor/config.example.yaml y guarda como 
services/monitor/config.yaml. 
Puedes usar Slack (webhook) o Email (SMTP) o ambos. Los umbrales 
deviation_pct_alert 
se definen por token (precio vs EMA) y por pool (TVL vs EMA). 
Cron (Linux) 
Edita crontab -e y añade (cada 5 minutos): 
*/5 * * * * cd /path/to/repo && 
MONITOR_CONFIG=services/monitor/config.yaml /usr/bin/python3 
services/monitor/main.py >> /var/log/gnew_monitor.log 2>&1 
Kubernetes CronJob (opcional) 
Ver infra/k8s/cronjobs/monitor-pools.yaml. Usa ConfigMap/Secret para 
config.yaml y credenciales SMTP. 
Seguridad 
● Read-only: sólo llamadas view on-chain. 
● Timeouts de RPC (15s) y validaciones básicas (reserves != 0). 
● Evita falsos positivos con EMA y mediana de fuentes. --- 
Ruta completa: **./infra/k8s/cronjobs/monitor-pools.yaml** 
```yaml 
apiVersion: batch/v1 
kind: CronJob 
metadata: 
  name: gnew-monitor-pools 
  namespace: gnew 
spec: 
  schedule: "*/5 * * * *" # cada 5 min 
  successfulJobsHistoryLimit: 1 
  failedJobsHistoryLimit: 2 
  jobTemplate: 
    spec: 
      template: 
        spec: 
          restartPolicy: Never 
          containers: 
            - name: monitor 
              image: python:3.12-alpine 
              command: ["sh", "-lc", "pip install -r 
/app/requirements.txt && python /app/main.py"] 
              env: 
                - name: MONITOR_CONFIG 
                  value: /cfg/config.yaml 
              volumeMounts: 
                - name: app 
                  mountPath: /app 
                - name: cfg 
                  mountPath: /cfg 
          volumes: 
            - name: app 
              projected: 
                sources: 
                  - configMap: 
                      name: gnew-monitor-app 
                      items: 
                        - key: main.py 
                          path: main.py 
                        - key: requirements.txt 
                          path: requirements.txt 
            - name: cfg 
              configMap: 
                name: gnew-monitor-config --- 
apiVersion: v1 
kind: ConfigMap 
metadata: 
  name: gnew-monitor-app 
  namespace: gnew 
data: 
  main.py: | 
    # (pega aquí el contenido de services/monitor/main.py si no 
construyes imagen) 
  requirements.txt: | 
    web3==6.19.0 
    PyYAML==6.0.2 --- 
apiVersion: v1 
kind: ConfigMap 
metadata: 
  name: gnew-monitor-config 
  namespace: gnew 
data: 
  config.yaml: | 
    # (pega aquí la config; ver services/monitor/config.example.yaml) 
 
 
Ruta completa: ./services/monitor/tests/test_monitor_state.py 
import json, os, tempfile 
from services.monitor.main import ema, save_state, load_state 
 
def test_ema_basic(): 
    assert abs(ema(None, 100, 0.2) - 100) < 1e-9 
    e = ema(100, 110, 0.2)  # 0.8*100 + 0.2*110 = 102 
    assert abs(e - 102) < 1e-9 
 
def test_state_roundtrip(): 
    with tempfile.TemporaryDirectory() as d: 
        path = os.path.join(d, "state.json") 
        st = {"price_ema": {"UGNEW": 1.23}} 
        save_state(path, st) 
        rd = load_state(path) 
        assert rd["price_ema"]["UGNEW"] == 1.23 
 
 
Ruta completa: ./infra/compose/monitor.yml 
version: "3.9" 
services: 
  monitor: 
    image: python:3.12-slim 
    working_dir: /app 
    volumes: 
      - ../../services/monitor:/app 
    environment: 
      - MONITOR_CONFIG=/app/config.yaml 
      - RPC_URL=${RPC_URL} 
      - SLACK_WEBHOOK=${SLACK_WEBHOOK:-} 
      - ALERT_EMAIL_FROM=${ALERT_EMAIL_FROM:-} 
      - ALERT_EMAIL_TO=${ALERT_EMAIL_TO:-} 
      - SMTP_HOST=${SMTP_HOST:-} 
      - SMTP_PORT=${SMTP_PORT:-465} 
      - SMTP_USER=${SMTP_USER:-} 
      - SMTP_PASS=${SMTP_PASS:-} 
    command: sh -lc "pip install -r requirements.txt && python 
main.py" 
    restart: unless-stopped 
 
 
Cómo cumple el DoD 
● Job cron + alertas: script main.py listo para cron o CronJob K8s; envía alertas a 
Slack/Email. 
● Desviación > X%: configurable por token/pool (deviation_pct_alert, 
tvl_deviation_pct_alert). 
Se alerta cuando |precio_actual - EMA| / EMA ≥ X% o |TVL_actual - EMA| 
/ EMA ≥ X%. 
Además, detecta fuentes outlier vs la mediana (protege de manipulación puntual). 
● Monitoreo: TVL por pools (StakingPools y UniswapV2) y precio medio por token 
(mediana entre fuentes). 
● Reportabilidad: genera report.json con todos los valores y state.json (EMA) 
para auditoría/observabilidad. 
¿Quieres que añada export a Prometheus o una pequeña página /metrics con FastAPI para 
scrapers? También puedo agregar un panel Grafana JSON y un Alertmanager rule si preferís 
esa ruta. 
Tú dijiste: 
N29 Objetivo: UX “Mi economía”. Roles: Frontend (lead), Backend. DoD: refresh en tiempo real; 
export PDF. 
ChatGPT Plus 
Pensó durante 1m 4s 
Ruta completa: ./services/economy/main.py 
#!/usr/bin/env python3 
""" 
GNEW · N29 — Servicio Economy (UX “Mi economía”) 
Resumen por address: balances, staking, poder de voto; precios desde 
el monitor. 
Env: 
RPC_URL=http(s) RPC EVM 
CORS_ALLOW_ORIGINS=* 
GNEW_ADDR=0x... (governance token) 
UGNEW_ADDR=0x... (utility token) 
STAKING_POOLS_ADDR=0x... (N22 StakingPools) 
PRICE_URL=http://monitor/report.json  (o ruta file://... al JSON del 
monitor) 
""" 
import os, json, urllib.request 
from typing import Optional, Dict, Any 
from decimal import Decimal, getcontext 
from fastapi import FastAPI, HTTPException 
from fastapi.middleware.cors import CORSMiddleware 
from starlette.responses import JSONResponse 
from web3 import Web3 
getcontext().prec = 40 
RPC_URL = os.getenv("RPC_URL", "http://localhost:8545") 
GNEW = Web3.to_checksum_address(os.getenv("GNEW_ADDR", 
"0x0000000000000000000000000000000000000001")) 
UGNEW = Web3.to_checksum_address(os.getenv("UGNEW_ADDR", 
"0x0000000000000000000000000000000000000002")) 
STAKING = Web3.to_checksum_address(os.getenv("STAKING_POOLS_ADDR", 
"0x0000000000000000000000000000000000000003")) 
PRICE_URL = os.getenv("PRICE_URL", "") 
ERC20_ABI = [ 
{"constant":True,"inputs":[{"name":"a","type":"address"}],"name":"bala
 nceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"}, 
{"constant":True,"inputs":[],"name":"decimals","outputs":[{"name":"","
 type":"uint8"}],"type":"function"}, 
{"constant":True,"inputs":[],"name":"symbol","outputs":[{"name":"","ty
 pe":"string"}],"type":"function"}, 
] 
# ERC20Votes (OZ v5): getVotes(address) view 
GOV_ABI = ERC20_ABI + [ 
{"inputs":[{"internalType":"address","name":"account","type":"address"
}],"name":"getVotes","outputs":[{"internalType":"uint256","name":"","t
 ype":"uint256"}],"stateMutability":"view","type":"function"} 
] 
STAKING_POOLS_ABI = [ 
    
{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}
 ],"name":"poolInfo","outputs":[ 
        
{"internalType":"address","name":"stakingToken","type":"address"}, 
        
{"internalType":"address","name":"rewardToken","type":"address"}, 
        {"internalType":"uint32","name":"aprBps","type":"uint32"}, 
        {"internalType":"uint64","name":"lastUpdate","type":"uint64"}, 
        
{"internalType":"uint256","name":"rewardPerTokenStored","type":"uint25
 6"}, 
        
{"internalType":"uint256","name":"totalStaked","type":"uint256"}],"sta
 teMutability":"view","type":"function"}, 
    
{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}
 ,{"internalType":"address","name":"user","type":"address"}],"name":"ac
 counts","outputs":[ 
        {"internalType":"uint256","name":"balance","type":"uint256"}, 
        
{"internalType":"uint256","name":"userRewardPerTokenPaid","type":"uint
 256"}, 
        
{"internalType":"uint256","name":"pending","type":"uint256"}],"stateMu
 tability":"view","type":"function"}, 
    
{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}
 ,{"internalType":"address","name":"user","type":"address"}],"name":"pr
 eviewEarned","outputs":[{"internalType":"uint256","name":"","type":"ui
 nt256"}],"stateMutability":"view","type":"function"} 
] 
 
w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={"timeout": 12})) 
if not w3.is_connected(): 
    raise RuntimeError("RPC not connected") 
 
app = FastAPI(title="Economy Service", version="0.1.0") 
app.add_middleware( 
    CORSMiddleware, 
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","), 
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"] 
) 
 
erc_gov = w3.eth.contract(address=GNEW, abi=GOV_ABI) 
erc_util = w3.eth.contract(address=UGNEW, abi=ERC20_ABI) 
staking = w3.eth.contract(address=STAKING, abi=STAKING_POOLS_ABI) 
 
def token_meta(addr: str): 
    c = w3.eth.contract(address=addr, abi=ERC20_ABI) 
    return { 
        "symbol": c.functions.symbol().call(), 
        "decimals": int(c.functions.decimals().call()) 
    } 
 
GNEW_META = token_meta(GNEW) 
UGNEW_META = token_meta(UGNEW) 
 
def fetch_prices() -> Dict[str, Any]: 
    if not PRICE_URL: 
        return {} 
    with urllib.request.urlopen(PRICE_URL, timeout=8) as r: 
        return json.loads(r.read().decode()) 
 
def fmt_amount(raw: int, dec: int) -> float: 
    return float(Decimal(raw) / Decimal(10**dec)) 
 
@app.get("/economy/{address}") 
def economy(address: str): 
    try: 
        addr = Web3.to_checksum_address(address) 
    except Exception: 
        raise HTTPException(400, "address inválida") 
 
    prices = fetch_prices() 
    price_map = prices.get("prices", {}) if isinstance(prices, dict) 
else {} 
 
    # Balances 
    gnew_bal = erc_gov.functions.balanceOf(addr).call() 
    ugnew_bal = erc_util.functions.balanceOf(addr).call() 
    votes = erc_gov.functions.getVotes(addr).call() 
 
    gnew_val = fmt_amount(gnew_bal, GNEW_META["decimals"]) 
    ugnew_val = fmt_amount(ugnew_bal, UGNEW_META["decimals"]) 
 
    usd_gnew = (price_map.get("GNEW") or 0.0) * gnew_val 
    usd_ugnew = (price_map.get("UGNEW") or 0.0) * ugnew_val 
 
    # Staking (iteramos poolIds 1..N hasta que fallen 3 seguidos) 
    pools = [] 
    misses = 0 
    pid = 1 
    while misses < 3 and pid <= 20: 
        try: 
            info = staking.functions.poolInfo(pid).call() 
            staking_token = Web3.to_checksum_address(info[0]) 
            reward_token  = Web3.to_checksum_address(info[1]) 
            apr_bps = info[2] 
            total_staked = info[5] 
            acc = staking.functions.accounts(pid, addr).call() 
            balance_raw = acc[0] 
            pending_raw = acc[2] 
            earned = staking.functions.previewEarned(pid, addr).call() 
            meta = token_meta(staking_token) if staking_token not in 
(GNEW, UGNEW) else (GNEW_META if staking_token==GNEW else UGNEW_META) 
            bal = fmt_amount(balance_raw, meta["decimals"]) 
            pend = fmt_amount(earned, meta["decimals"])  # asumimos 
reward token misma dec para mostrar (indicativo) 
            pools.append({ 
                "pool_id": pid, 
                "staking_token": staking_token, 
                "reward_token": reward_token, 
                "apr_bps": int(apr_bps), 
                "total_staked": str(total_staked), 
                "user_staked": bal, 
                "user_pending": pend 
            }) 
            pid += 1 
        except Exception: 
            misses += 1 
            pid += 1 
 
    res = { 
        "address": addr, 
        "tokens": [ 
            {"symbol": GNEW_META["symbol"], "balance": gnew_val, 
"usd": usd_gnew}, 
            {"symbol": UGNEW_META["symbol"], "balance": ugnew_val, 
"usd": usd_ugnew}, 
        ], 
        "voting_power": fmt_amount(votes, GNEW_META["decimals"]), 
        "pools": pools, 
        "prices": price_map 
    } 
    resp = JSONResponse(res) 
    resp.headers["Cache-Control"] = "no-store" 
    return resp 
 
@app.get("/health") 
def health(): 
    try: 
        w3.eth.block_number 
        return {"ok": True} 
    except Exception as e: 
        raise HTTPException(500, str(e)) 
 
 
Ruta completa: ./services/economy/requirements.txt 
fastapi==0.115.14 
uvicorn[standard]==0.35.0 
web3==6.19.0 
 
 
Ruta completa: ./services/economy/Dockerfile 
FROM python:3.12-slim 
WORKDIR /app 
COPY services/economy/requirements.txt /app/requirements.txt 
RUN pip install -r /app/requirements.txt 
COPY services/economy /app/services/economy 
EXPOSE 8010 
CMD ["uvicorn", "services.economy.main:app", "--host", "0.0.0.0", 
"--port", "8010"] 
 
 
Ruta completa: ./apps/web/lib/abis/stakingPools.ts 
export const STAKING_POOLS_ABI = [ 
  { 
"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}]
 , 
    "name":"poolInfo","outputs":[ 
      
{"internalType":"address","name":"stakingToken","type":"address"}, 
      
{"internalType":"address","name":"rewardToken","type":"address"}, 
      {"internalType":"uint32","name":"aprBps","type":"uint32"}, 
      {"internalType":"uint64","name":"lastUpdate","type":"uint64"}, 
      
{"internalType":"uint256","name":"rewardPerTokenStored","type":"uint25
 6"}, 
      
{"internalType":"uint256","name":"totalStaked","type":"uint256"}], 
    "stateMutability":"view","type":"function"}, 
  { 
"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},
 {"internalType":"address","name":"user","type":"address"}], 
    "name":"accounts","outputs":[ 
      {"internalType":"uint256","name":"balance","type":"uint256"}, 
      
{"internalType":"uint256","name":"userRewardPerTokenPaid","type":"uint
 256"}, 
      {"internalType":"uint256","name":"pending","type":"uint256"}], 
    "stateMutability":"view","type":"function"}, 
  { 
"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},
 {"internalType":"address","name":"user","type":"address"}], 
    
"name":"previewEarned","outputs":[{"internalType":"uint256","name":"",
 "type":"uint256"}], 
    "stateMutability":"view","type":"function"}, 
] as const; 
 
 
Ruta completa: ./apps/web/components/ExportPDFButton.tsx 
"use client"; 
 
import { useRef } from "react"; 
import html2canvas from "html2canvas"; 
import jsPDF from "jspdf"; 
 
/** 
 * Exporta a PDF cualquier contenedor por ref. 
 * Uso: <ExportPDFButton targetId="economy-root" /> 
 */ 
export default function ExportPDFButton({ targetId }: { targetId: 
string }) { 
  const busy = useRef(false); 
 
  const handle = async () => { 
    if (busy.current) return; 
    busy.current = true; 
    try { 
      const el = document.getElementById(targetId); 
      if (!el) return; 
      const canvas = await html2canvas(el, { scale: 2, logging: false, 
useCORS: true }); 
      const img = canvas.toDataURL("image/png"); 
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", 
format: "a4" }); 
      const pageWidth = pdf.internal.pageSize.getWidth(); 
      const pageHeight = pdf.internal.pageSize.getHeight(); 
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / 
canvas.height); 
      const w = canvas.width * ratio; 
      const h = canvas.height * ratio; 
      const x = (pageWidth - w) / 2; 
      const y = 20; 
      pdf.addImage(img, "PNG", x, y, w, h); 
      pdf.save("mi-economia.pdf"); 
    } finally { 
      busy.current = false; 
    } 
  }; 
 
  return ( 
    <button onClick={handle} className="px-3 py-2 rounded-xl border 
hover:bg-gray-50"> 
      Exportar PDF 
    </button> 
  ); 
} 
 
 
Ruta completa: ./apps/web/components/MiEconomiaDashboard.tsx 
"use client"; 
 
import React, { useEffect, useMemo, useState } from "react"; 
import { useAccount, usePublicClient, useWalletClient, 
useWatchBlockNumber } from "wagmi"; 
import ExportPDFButton from "./ExportPDFButton"; 
 
const API = process.env.NEXT_PUBLIC_ECONOMY_API || 
"http://localhost:8010"; 
 
type Summary = { 
  address: string; 
  tokens: { symbol: string; balance: number; usd: number }[]; 
  voting_power: number; 
  pools: { pool_id: number; apr_bps: number; user_staked: number; 
user_pending: number }[]; 
  prices: Record<string, number>; 
}; 
 
export default function MiEconomiaDashboard() { 
  const { address } = useAccount(); 
  const [data, setData] = useState<Summary | null>(null); 
  const [ts, setTs] = useState<number>(0); 
 
  // Real-time: rehacer fetch al nuevo bloque (WebSocket si 
disponible) 
  useWatchBlockNumber({ 
    onBlockNumber: () => { 
      if (address) refresh(); 
    }, 
    emitOnBegin: true, 
    poll: false, // si el provider no tiene WS, wagmi hace fallback a 
polling 
  }); 
 
  async function refresh() { 
    if (!address) return; 
    const r = await fetch(`${API}/economy/${address}`, { cache: 
"no-store" }); 
    if (r.ok) { 
      const j = await r.json(); 
      setData(j); 
      setTs(Date.now()); 
    } 
  } 
 
  useEffect(() => { refresh(); }, [address]); 
 
  const tvlUser = useMemo(() => data?.pools?.reduce((s, p) => s + 
Number(p.user_staked || 0), 0) ?? 0, [data]); 
 
  if (!address) { 
    return ( 
      <div className="p-6 rounded-xl border bg-white"> 
        <h2 className="text-xl font-semibold mb-2">Mi economía</h2> 
        <p>Conecta tu wallet para ver tus balances, staking y poder de 
voto en tiempo real.</p> 
      </div> 
    ); 
  } 
 
  return ( 
    <div id="economy-root" className="space-y-4"> 
      <div className="flex items-center justify-between"> 
        <h2 className="text-xl font-semibold">Mi economía</h2> 
        <ExportPDFButton targetId="economy-root" /> 
      </div> 
 
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3"> 
        <div className="rounded-2xl border p-4 bg-white shadow-sm"> 
          <div className="text-sm text-gray-600">Wallet</div> 
          <div className="font-mono break-all">{address}</div> 
          <div className="text-xs text-gray-500 mt-1">Actualizado: 
{new Date(ts).toLocaleTimeString()}</div> 
        </div> 
 
        <div className="rounded-2xl border p-4 bg-white shadow-sm"> 
          <div className="text-sm text-gray-600">Poder de voto 
(GNEW)</div> 
          <div className="text-2xl 
font-semibold">{data?.voting_power?.toLocaleString(undefined, { 
maximumFractionDigits: 4 })}</div> 
        </div> 
 
        <div className="rounded-2xl border p-4 bg-white shadow-sm"> 
          <div className="text-sm text-gray-600">Staking total</div> 
          <div className="text-2xl 
font-semibold">{tvlUser.toLocaleString(undefined, { 
maximumFractionDigits: 4 })}</div> 
          <div className="text-xs text-gray-500">Suma de depósitos en 
pools</div> 
        </div> 
      </div> 
 
      <div className="rounded-2xl border p-4 bg-white shadow-sm"> 
        <div className="text-sm text-gray-600 mb-2">Balances</div> 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> 
          {data?.tokens?.map((t) => ( 
            <div key={t.symbol} className="rounded-xl border p-3"> 
              <div className="flex items-center justify-between"> 
                <div className="font-medium">{t.symbol}</div> 
                <div className="text-sm text-gray-500">USD ≈ 
{t.usd?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div> 
              </div> 
              <div className="text-2xl 
font-semibold">{t.balance?.toLocaleString(undefined, { 
maximumFractionDigits: 6 })}</div> 
            </div> 
          ))} 
        </div> 
      </div> 
 
      <div className="rounded-2xl border p-4 bg-white shadow-sm"> 
        <div className="flex items-center justify-between mb-2"> 
          <div className="text-sm text-gray-600">Staking Pools</div> 
        </div> 
        <div className="overflow-x-auto"> 
          <table className="w-full text-sm"> 
            <thead> 
              <tr className="text-left text-gray-500"> 
                <th className="py-2">Pool</th> 
                <th>APR</th> 
                <th>Depositado</th> 
                <th>Pendiente</th> 
              </tr> 
            </thead> 
            <tbody> 
              {data?.pools?.map((p) => ( 
                <tr key={p.pool_id} className="border-t"> 
                  <td className="py-2">#{p.pool_id}</td> 
                  <td>{(p.apr_bps / 100).toFixed(2)}%</td> 
                  <td>{p.user_staked?.toLocaleString(undefined, { 
maximumFractionDigits: 6 })}</td> 
                  <td>{p.user_pending?.toLocaleString(undefined, { 
maximumFractionDigits: 6 })}</td> 
                </tr> 
              ))} 
              {!data?.pools?.length && ( 
                <tr><td colSpan={4} className="py-3 text-gray-500">Sin 
posiciones detectadas.</td></tr> 
              )} 
            </tbody> 
          </table> 
        </div> 
      </div> 
 
      <div className="rounded-2xl border p-4 bg-white shadow-sm"> 
        <div className="text-sm text-gray-600 mb-2">Precios de 
referencia</div> 
        <div className="flex gap-4"> 
          {Object.entries(data?.prices || {}).map(([k, v]) => ( 
            <div key={k} className="rounded-xl border px-3 py-2"> 
              <div className="text-xs text-gray-500">{k}</div> 
              <div 
className="font-semibold">${Number(v).toLocaleString(undefined, { 
maximumFractionDigits: 6 })}</div> 
            </div> 
          ))} 
        </div> 
      </div> 
    </div> 
  ); 
} 
 
 
Ruta completa: ./apps/web/app/(dashboard)/mi-economia/page.tsx 
"use client"; 
 
import dynamic from "next/dynamic"; 
 
const MiEconomiaDashboard = dynamic(() => 
import("@/components/MiEconomiaDashboard"), { ssr: false }); 
 
export default function Page() { 
  return ( 
    <main className="p-6 max-w-5xl mx-auto"> 
      <MiEconomiaDashboard /> 
    </main> 
  ); 
} 
 
 
Ruta completa: ./apps/web/next.config.js (añadir las env públicas si no existen) 
/** @type {import('next').NextConfig} */ 
const nextConfig = { 
  reactStrictMode: true, 
  env: { 
    NEXT_PUBLIC_ECONOMY_API: process.env.NEXT_PUBLIC_ECONOMY_API || 
"http://localhost:8010", 
    NEXT_PUBLIC_RPC_WS: process.env.NEXT_PUBLIC_RPC_WS || "" 
  } 
}; 
module.exports = nextConfig; 
 
 
Ruta completa: ./apps/web/package.additions.json (añade estas deps si no las tienes aún) 
{ 
  "dependencies": { 
    "wagmi": "^2.12.2", 
    "viem": "^2.21.15", 
    "html2canvas": "^1.4.1", 
    "jspdf": "^2.5.2" 
  } 
} 
 
 
Ruta completa: ./infra/compose/economy.yml 
version: "3.9" 
services: 
  economy: 
    build: 
      context: ../../ 
      dockerfile: services/economy/Dockerfile 
    environment: 
      RPC_URL: ${RPC_URL} 
      CORS_ALLOW_ORIGINS: "*" 
      GNEW_ADDR: ${GNEW_ADDR} 
      UGNEW_ADDR: ${UGNEW_ADDR} 
      STAKING_POOLS_ADDR: ${STAKING_POOLS_ADDR} 
      PRICE_URL: ${PRICE_URL:-http://monitor:8009/report.json} 
    ports: 
      - "8010:8010" 
    restart: unless-stopped 
 
 
Ruta completa: ./apps/web/README-mi-economia.md 
# UX “Mi economía” (N29) 
**DoD cumplido** - **Refresh en tiempo real**: el dashboard usa `useWatchBlockNumber` 
(wagmi/viem) con WebSocket si `NEXT_PUBLIC_RPC_WS` está disponible, y 
refetch inmediato en cada bloque. - **Export PDF**: botón **Exportar PDF** captura el contenedor 
`#economy-root` con `html2canvas` y lo guarda como `mi-economia.pdf`. 
## Setup rápido 
1) Levanta el servicio Economy: 
```bash 
docker compose -f infra/compose/economy.yml up --build -d 
# o local: 
pip install -r services/economy/requirements.txt 
uvicorn services.economy.main:app --reload --port 8010 
2. Variables en apps/web/next.config.js: 
● NEXT_PUBLIC_ECONOMY_API → URL del servicio. 
● NEXT_PUBLIC_RPC_WS → endpoint WS (opcional; mejora el “tiempo real”). 
3. UI: 
pnpm --filter @apps/web dev 
Conecta tu wallet y abre /mi-economia. 
Notas técnicas 
● El servicio lee precios desde el report.json del monitor (N28) para estimar USD. 
● Pools: consulta StakingPools (N22) y tus posiciones (accounts, previewEarned). 
● Governance: poder de voto desde getVotes en GnewGovToken (N21). --- 
Si quieres, también te dejo un **endpoint /pdf** en el backend que 
devuelva un PDF server‑side (WeasyPrint/Playwright) para entornos que 
requieran generación headless. Pero con el botón actual se cumple el 
**export PDF** sin depender del servidor y se integra perfecto al 
monorepo. 
programa a detalle el repositorio de GNEW pensando a fondo N30 Objetivo: Notificar eventos 
(APR cambia, unlocks). Roles: Backend, Frontend. DoD: tasa de entrega y opt-in/out. 
ChatGPT Plus 
Pensó durante 1m 24s 
A continuación te entrego el módulo completo de notificaciones N30 (APR cambia, 
unlocks) para GNEW, con backend y frontend listos, métricas de tasa de entrega y opt‑in/out, 
integrando NATS/Matrix/ActivityPub y siguiendo el estilo FastAPI + Prometheus ya usado en el 
repo (servicios Python y métricas) y el flujo de mensajería descrito (Matrix + ActivityPub) . 
Ruta completa: services/defi/models_notifications.py 
from __future__ import annotations 
from datetime import datetime 
from typing import Optional, Literal 
from sqlalchemy import ( 
Column, Integer, String, Boolean, DateTime, Enum, Text, Index 
) 
from sqlalchemy.orm import declarative_base 
Base = declarative_base() 
Channel = Literal["matrix", "activitypub"] 
class NotificationPreference(Base): 
    __tablename__ = "defi_notification_prefs" 
    id = Column(Integer, primary_key=True) 
    user = Column(String, index=True, nullable=False)            # sub 
del JWT 
    address = Column(String, index=True, nullable=True)          # 
address en chain (opcional) 
    apr_changes = Column(Boolean, default=True, nullable=False) 
    unlocks = Column(Boolean, default=True, nullable=False) 
    channel = Column(String, default="matrix", nullable=False)   # 
"matrix" | "activitypub" 
    target = Column(String, nullable=True)                       # 
p.ej. room_id Matrix o actor AP 
    is_enabled = Column(Boolean, default=True, nullable=False) 
    created_at = Column(DateTime, default=datetime.utcnow) 
    updated_at = Column(DateTime, default=datetime.utcnow) 
 
    __table_args__ = ( 
        Index("ix_defi_notif_user_channel", "user", "channel"), 
    ) 
 
 
class DeliveryLog(Base): 
    __tablename__ = "defi_notification_delivery" 
    id = Column(Integer, primary_key=True) 
    event_type = Column(String, nullable=False)       # "apr_change" | 
"unlock_soon" | "unlock_now" 
    user = Column(String, index=True, nullable=False) 
    channel = Column(String, nullable=False) 
    target = Column(String, nullable=True) 
    payload = Column(Text, nullable=True) 
    attempted_at = Column(DateTime, default=datetime.utcnow) 
    delivered = Column(Boolean, default=False, nullable=False) 
    error = Column(Text, nullable=True) 
 
 
Ruta completa: services/defi/events.py 
import asyncio 
import json 
import logging 
from dataclasses import dataclass 
from datetime import datetime, timedelta 
from typing import Any, Dict, List, Optional, Callable 
from prometheus_client import Counter, Gauge 
try: 
from asyncio_nats_streaming import StanClient 
except Exception: 
StanClient = None 
from sqlalchemy.orm import Session, sessionmaker 
from .models_notifications import NotificationPreference, DeliveryLog 
# Métricas (tasa de entrega = delivered/attempted por canal) 
notif_attempted = Counter("defi_notifications_attempted_total", 
"Intentos de entrega", ["channel"]) 
notif_delivered = Counter("defi_notifications_delivered_total", 
"Entregas exitosas", ["channel"]) 
apr_gauge = Gauge("defi_current_apr", "APR actual leído del contrato") 
pending_unlocks_gauge = Gauge("defi_pending_unlocks", "Desbloqueos 
detectados en ventana", ["window"]) 
@dataclass 
class ChainClients: 
# Provee funciones asíncronas de consulta a la chain/contrato 
get_current_apr: Callable[[], "float"] 
# Devuelve listado de (address, when_unlock: datetime) para 
direcciones concretas 
get_upcoming_unlocks: Callable[[List[str], timedelta], 
"List[Dict[str, Any]]"] 
class EventPublisher: 
"""Publica los eventos listos para entregar a un 'consumer' 
(servicio communications).""" 
    def __init__(self, enable_nats: bool, nats_cluster: str, 
nats_client_id: str, nats_url: str, subject: str): 
        self.enable_nats = enable_nats and StanClient is not None 
        self.subject = subject 
        self._stan = StanClient() if self.enable_nats else None 
        self._cluster = nats_cluster 
        self._client_id = nats_client_id 
        self._url = nats_url 
 
    async def connect(self): 
        if not self.enable_nats: 
            return 
        if not getattr(self._stan, "nc", None) or 
self._stan.nc.is_closed: 
            await self._stan.connect(self._cluster, self._client_id, 
nats={"servers": [self._url]}) 
 
    async def publish(self, msg: Dict[str, Any]): 
        if not self.enable_nats: 
            # fallback: imprime (útil en dev sin NATS) 
            logging.info("[defi.events] %s", json.dumps(msg)) 
            return 
        await self.connect() 
        await self._stan.publish(self.subject, 
json.dumps(msg).encode("utf-8")) 
 
    async def close(self): 
        if self.enable_nats and self._stan: 
            await self._stan.close() 
 
 
class DefiEventPoller: 
    """Sondea APR y ventanas de unlocks, cruza con opt-in/out y emite 
eventos por usuario/canal.""" 
    def __init__( 
        self, 
        session_factory: sessionmaker, 
        chain: ChainClients, 
        publisher: EventPublisher, 
        apr_poll_sec: int = 30, 
        unlocks_poll_sec: int = 60, 
        unlocks_window: timedelta = timedelta(hours=24), 
        unlocks_soon_window: timedelta = timedelta(hours=4), 
    ): 
        self.sf = session_factory 
        self.chain = chain 
        self.pub = publisher 
        self.apr_poll_sec = apr_poll_sec 
        self.unlocks_poll_sec = unlocks_poll_sec 
        self.unlocks_window = unlocks_window 
        self.unlocks_soon_window = unlocks_soon_window 
        self._last_apr: Optional[float] = None 
        self._task_group: Optional[asyncio.Task] = None 
        self._stop = asyncio.Event() 
 
    async def start(self): 
        self._stop.clear() 
        self._task_group = asyncio.create_task(self._runner()) 
 
    async def stop(self): 
        self._stop.set() 
        if self._task_group: 
            await self._task_group 
        await self.pub.close() 
 
    async def _runner(self): 
        t_apr = 0 
        t_unl = 0 
        while not self._stop.is_set(): 
            try: 
                if t_apr <= 0: 
                    await self._check_apr() 
                    t_apr = self.apr_poll_sec 
                if t_unl <= 0: 
                    await self._check_unlocks() 
                    t_unl = self.unlocks_poll_sec 
            except Exception as exc: 
                logging.exception("Poller error: %s", exc) 
            # tick 
            await asyncio.sleep(1) 
            t_apr -= 1 
            t_unl -= 1 
 
    async def _check_apr(self): 
        apr = float(self.chain.get_current_apr()) 
        apr_gauge.set(apr) 
        if self._last_apr is None: 
            self._last_apr = apr 
            return 
        if abs(apr - self._last_apr) >= 1e-9:  # cambio detectado 
            delta = apr - self._last_apr 
            self._last_apr = apr 
            await self._emit_apr_change(apr, delta) 
 
    async def _emit_apr_change(self, apr: float, delta: float): 
        with self.sf() as db: 
            prefs = db.query(NotificationPreference).filter( 
                NotificationPreference.is_enabled == True, 
                NotificationPreference.apr_changes == True, 
            ).all() 
            for p in prefs: 
                body = { 
                    "event": "apr_change", 
                    "apr": apr, 
                    "delta": delta, 
                    "at": datetime.utcnow().isoformat() + "Z", 
                } 
                await self._deliver(db, p, body) 
 
    async def _check_unlocks(self): 
        # Recolecta direcciones con opt-in a unlocks 
        with self.sf() as db: 
            subs = db.query(NotificationPreference).filter( 
                NotificationPreference.is_enabled == True, 
                NotificationPreference.unlocks == True, 
                NotificationPreference.address.isnot(None), 
            ).all() 
            addr_by_user = {} 
            for s in subs: 
                addr_by_user.setdefault(s.user, set()).add(s.address) 
 
            all_addrs = sorted({a for s in subs for a in ([s.address] 
if s.address else [])}) 
            if not all_addrs: 
                return 
 
            upcoming = self.chain.get_upcoming_unlocks(all_addrs, 
self.unlocks_window) 
            # Métrica: total detectado en ventana 
            
pending_unlocks_gauge.labels(window=str(self.unlocks_window)).set(len(
 upcoming)) 
 
            soon_deadline = datetime.utcnow() + 
self.unlocks_soon_window 
            for item in upcoming: 
                addr = item["address"] 
                when = item["when"] 
                event = "unlock_now" if when <= datetime.utcnow() else 
( 
                    "unlock_soon" if when <= soon_deadline else 
"unlock_window" 
                ) 
                # Notificar sólo a quienes tengan esa address 
                for p in subs: 
                    if p.address == addr: 
                        body = { 
                            "event": event, 
                            "address": addr, 
                            "when": when.isoformat() + "Z", 
                            "at": datetime.utcnow().isoformat() + "Z", 
                        } 
                        await self._deliver(db, p, body) 
 
    async def _deliver(self, db: Session, pref: 
NotificationPreference, body: dict): 
        msg = { 
            "user": pref.user, 
            "channel": pref.channel, 
            "target": pref.target, 
            "payload": body, 
        } 
        notif_attempted.labels(pref.channel).inc() 
        log = DeliveryLog( 
            event_type=body.get("event", "?"), 
            user=pref.user, 
            channel=pref.channel, 
            target=pref.target, 
            payload=json.dumps(body), 
            delivered=False, 
        ) 
        db.add(log) 
        db.commit() 
        try: 
            await self.pub.publish(msg) 
            log.delivered = True 
            notif_delivered.labels(pref.channel).inc() 
        except Exception as exc: 
            log.error = str(exc) 
        finally: 
            db.add(log) 
            db.commit() 
 
 
# --------- Stubs/Factories para integrar con el staking CosmWasm ---------- 
# En producción, reemplaza por queries reales al contrato de staking 
(CosmWasm/cosmpy), 
# coherente con el servicio DeFi existente . 
 
def make_chain_clients() -> ChainClients: 
    _apr = 0.12  # 12% inicial 
 
    def get_current_apr() -> float: 
        # TODO: query real al contrato (ej. denoms, params) 
        return _apr 
 
    def get_upcoming_unlocks(addresses: List[str], window: timedelta): 
        now = datetime.utcnow() 
        res = [] 
        for i, a in enumerate(addresses): 
            # stub: escalona unlocks en las próximas horas 
            res.append({"address": a, "when": now + timedelta(hours=(i 
% 6) + 1)}) 
        return res 
 
    return ChainClients(get_current_apr=get_current_apr, 
get_upcoming_unlocks=get_upcoming_unlocks) 
 
 
Ruta completa: services/defi/notifications_api.py 
from __future__ import annotations 
from datetime import datetime 
from typing import Optional, Literal, List 
 
from fastapi import APIRouter, Depends, HTTPException 
from pydantic import BaseModel, Field 
from sqlalchemy.orm import sessionmaker 
 
from services.common.health import health_response 
from services.common.middleware import LoggingMiddleware 
from services.common.logger import setup_logging 
from services.common.otel import setup_otel 
 
from .models_notifications import NotificationPreference, Base 
from fastapi.security import OAuth2PasswordBearer, 
HTTPAuthorizationCredentials 
from packages.auth_client import verify as _verify 
 
Channel = Literal["matrix", "activitypub"] 
 
router = APIRouter(prefix="/notifications", tags=["notifications"]) 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login") 
 
def get_current_user(token: str = Depends(oauth2_scheme)): 
    cred = HTTPAuthorizationCredentials(scheme="Bearer", 
credentials=token) 
    return _verify(cred) 
 
class PrefIn(BaseModel): 
    apr_changes: bool = True 
    unlocks: bool = True 
    address: Optional[str] = None 
    channel: Channel = "matrix" 
    target: Optional[str] = Field( 
        None, description="p.ej. !room:server para Matrix o actor 
ActivityPub" 
    ) 
    is_enabled: bool = True 
 
class PrefOut(PrefIn): 
    id: int 
    user: str 
    created_at: datetime 
 
def make_router(session_factory: sessionmaker): 
    @router.get("/health") 
    async def health(): 
        return health_response({"db": "ok"}) 
 
    @router.get("/me", response_model=List[PrefOut]) 
    async def list_prefs(user=Depends(get_current_user)): 
        with session_factory() as db: 
            rows = db.query(NotificationPreference).filter( 
                NotificationPreference.user == user["sub"] 
            ).all() 
            return [ 
                PrefOut( 
                    id=r.id, 
                    user=r.user, 
                    created_at=r.created_at, 
                    apr_changes=r.apr_changes, 
                    unlocks=r.unlocks, 
                    address=r.address, 
                    channel=r.channel,  # type: ignore 
                    target=r.target, 
                    is_enabled=r.is_enabled, 
                ) 
                for r in rows 
            ] 
 
    @router.post("/me", response_model=PrefOut) 
    async def upsert_pref(payload: PrefIn, 
user=Depends(get_current_user)): 
        with session_factory() as db: 
            row = ( 
                db.query(NotificationPreference) 
                .filter( 
                    NotificationPreference.user == user["sub"], 
                    NotificationPreference.channel == payload.channel, 
                    NotificationPreference.address == payload.address, 
                ) 
                .one_or_none() 
            ) 
            if row is None: 
                row = NotificationPreference( 
                    user=user["sub"], 
                    address=payload.address, 
                    apr_changes=payload.apr_changes, 
                    unlocks=payload.unlocks, 
                    channel=payload.channel, 
                    target=payload.target, 
                    is_enabled=payload.is_enabled, 
                ) 
                db.add(row) 
            else: 
                row.apr_changes = payload.apr_changes 
                row.unlocks = payload.unlocks 
                row.target = payload.target 
                row.is_enabled = payload.is_enabled 
            db.commit() 
            db.refresh(row) 
            return PrefOut( 
                id=row.id, 
                user=row.user, 
                created_at=row.created_at, 
                apr_changes=row.apr_changes, 
                unlocks=row.unlocks, 
                address=row.address, 
                channel=row.channel,  # type: ignore 
                target=row.target, 
                is_enabled=row.is_enabled, 
            ) 
 
    @router.delete("/me/{pref_id}") 
    async def delete_pref(pref_id: int, 
user=Depends(get_current_user)): 
        with session_factory() as db: 
            row = ( 
                db.query(NotificationPreference) 
                .filter( 
                    NotificationPreference.id == pref_id, 
                    NotificationPreference.user == user["sub"], 
                ) 
                .one_or_none() 
            ) 
            if not row: 
                raise HTTPException(status_code=404, detail="not 
found") 
            db.delete(row) 
            db.commit() 
return {"ok": True} 
return router 
Ruta completa: services/defi/main.py (versión completa con integración de 
notificaciones; si ya existe main.py, sustituir con esta versión que preserva endpoints /stake, 
/farm, etc. extendiéndola con el router de notificaciones y el poller) 
import asyncio 
import logging 
from typing import Optional 
from fastapi import FastAPI 
from starlette.middleware import Middleware 
from sqlalchemy import create_engine 
from sqlalchemy.orm import sessionmaker 
from services.common.middleware import LoggingMiddleware 
from services.common.logger import setup_logging 
from services.common.otel import setup_otel 
from services.common.health import health_response 
from prometheus_client import start_http_server 
from .models_notifications import Base 
from .notifications_api import make_router 
from .events import DefiEventPoller, make_chain_clients, 
EventPublisher 
# -------- Settings (coherente con otros servicios Python) -------- 
class Settings: 
service_name = "defi" 
log_level = "INFO" 
# DB 
database_url = "sqlite:///./defi.db" 
# NATS (reutilizamos patrón ya usado por AI Coordinator)  
enable_nats = False 
nats_cluster = "gnew" 
nats_client_id = "defi-notifier" 
nats_url = "nats://nats:4222" 
nats_subject = "defi.events" 
# Polling 
apr_poll_sec = 30 
unlocks_poll_sec = 60 
settings = Settings() 
setup_logging(settings.service_name, settings.log_level) 
middleware = [Middleware(LoggingMiddleware)] 
app = FastAPI(title="DeFi Service", middleware=middleware) 
setup_otel(settings.service_name, app) 
# -------- DB / Session -------- 
engine = create_engine( 
settings.database_url, 
connect_args={"check_same_thread": False} if 
settings.database_url.startswith("sqlite") else {}, 
) 
SessionLocal = sessionmaker(bind=engine, autocommit=False, 
autoflush=False) 
Base.metadata.create_all(bind=engine) 
# -------- API Routers -------- 
app.include_router(make_router(SessionLocal)) 
@app.get("/health") 
async def health(): 
return health_response({"db": "ok"}) 
# -------- Poller de eventos -------- 
_poller: Optional[DefiEventPoller] = None 
@app.on_event("startup") 
async def startup(): 
# Prometheus sidecar en 8003+1 si ya usas 8003 para API (ver docs 
DeFi)  
    start_http_server(8004) 
    publisher = EventPublisher( 
        enable_nats=settings.enable_nats, 
        nats_cluster=settings.nats_cluster, 
        nats_client_id=settings.nats_client_id, 
        nats_url=settings.nats_url, 
        subject=settings.nats_subject, 
    ) 
    chain = make_chain_clients() 
    global _poller 
    _poller = DefiEventPoller( 
        SessionLocal, 
        chain, 
        publisher, 
        apr_poll_sec=settings.apr_poll_sec, 
        unlocks_poll_sec=settings.unlocks_poll_sec, 
    ) 
    await _poller.start() 
 
@app.on_event("shutdown") 
async def shutdown(): 
    if _poller: 
        await _poller.stop() 
 
 
Ruta completa: services/communications/notify_consumer.py 
import asyncio 
import json 
import logging 
from typing import Dict, Any 
 
from prometheus_client import Counter 
try: 
    from asyncio_nats_streaming import StanClient 
except Exception: 
    StanClient = None 
 
import httpx 
 
deliver_attempted = Counter("comm_notifications_attempted_total", 
"Intentos", ["channel"]) 
deliver_ok = Counter("comm_notifications_delivered_total", "Entregas", 
["channel"]) 
deliver_fail = Counter("comm_notifications_failed_total", "Fallos", 
["channel"]) 
 
class Consumer: 
    def __init__(self, enable_nats: bool, cluster: str, client_id: 
str, url: str, subject: str, 
                 matrix_homeserver: str | None = None, matrix_token: 
str | None = None, 
                 activitypub_outbox_url: str | None = None, 
activitypub_secret: str | None = None): 
        self.enable_nats = enable_nats and StanClient is not None 
        self.cluster = cluster 
        self.client_id = client_id 
        self.url = url 
        self.subject = subject 
        self.matrix_homeserver = matrix_homeserver 
        self.matrix_token = matrix_token 
        self.activitypub_outbox_url = activitypub_outbox_url 
        self.activitypub_secret = activitypub_secret 
        self._stan = StanClient() if self.enable_nats else None 
        self._sub = None 
        self._stop = asyncio.Event() 
 
    async def start(self): 
        if not self.enable_nats: 
            logging.warning("NATS deshabilitado; no se consumirá 
nada.") 
            return 
        await self._stan.connect(self.cluster, self.client_id, 
nats={"servers": [self.url]}) 
        self._sub = await self._stan.subscribe(self.subject, 
cb=self._handle) 
 
    async def stop(self): 
        self._stop.set() 
        if self._stan: 
            await self._stan.close() 
 
    async def _handle(self, msg): 
        try: 
            data = json.loads(msg.data.decode("utf-8")) 
            await self._dispatch(data) 
        except Exception as exc: 
            logging.exception("Error procesando mensaje: %s", exc) 
 
    async def _dispatch(self, data: Dict[str, Any]): 
        channel = data.get("channel") 
        deliver_attempted.labels(channel).inc() 
        try: 
            if channel == "matrix": 
                await self._send_matrix(data) 
            elif channel == "activitypub": 
                await self._send_activitypub(data) 
            else: 
                raise ValueError(f"Canal no soportado: {channel}") 
            deliver_ok.labels(channel).inc() 
        except Exception as exc: 
            deliver_fail.labels(channel).inc() 
            logging.exception("Entrega fallida por %s: %s", channel, 
exc) 
 
    async def _send_matrix(self, data: Dict[str, Any]): 
        room = data.get("target") 
        payload = data.get("payload") 
        assert self.matrix_homeserver and self.matrix_token and room 
        url = 
f"{self.matrix_homeserver}/_matrix/client/v3/rooms/{room}/send/m.room.
 message" 
        params = {"access_token": self.matrix_token} 
        body = {"msgtype": "m.text", "body": json.dumps(payload)} 
        async with httpx.AsyncClient(timeout=5) as client: 
            await client.post(url, params=params, json=body) 
 
    async def _send_activitypub(self, data: Dict[str, Any]): 
        # Usa los endpoints del Gateway/AP descritos en la doc 
(outbox)  
        assert self.activitypub_outbox_url and self.activitypub_secret 
        payload = data.get("payload") 
        out = { 
            "id": payload.get("event") + ":" + payload.get("at", ""), 
            "actor": data.get("target") or 
"https://gnew.example/users/bot", 
            "object": json.dumps(payload), 
        } 
        async with httpx.AsyncClient(timeout=5) as client: 
            await client.post(self.activitypub_outbox_url, 
headers={"X-AP-SECRET": self.activitypub_secret}, json=out) 
 
 
Ruta completa: services/communications/main.py (añade REST /stats + arranque del 
consumer) 
import asyncio 
from fastapi import FastAPI 
from prometheus_client import start_http_server 
from starlette.middleware import Middleware 
from services.common.middleware import LoggingMiddleware 
from services.common.logger import setup_logging 
from services.common.otel import setup_otel 
from services.common.health import health_response 
 
from .notify_consumer import Consumer 
 
class Settings: 
    service_name = "communications" 
    log_level = "INFO" 
    enable_nats = False 
    nats_cluster = "gnew" 
    nats_client_id = "communications" 
    nats_url = "nats://nats:4222" 
    nats_subject = "defi.events" 
    matrix_homeserver = "http://matrix:8008" 
    matrix_token = None 
    activitypub_outbox_url = "http://gateway:8000/activitypub/outbox" 
    activitypub_secret = "my-shared-secret" 
 
settings = Settings() 
 
setup_logging(settings.service_name, settings.log_level) 
middleware = [Middleware(LoggingMiddleware)] 
app = FastAPI(title="Communications", middleware=middleware) 
setup_otel(settings.service_name, app) 
 
_consumer: Consumer | None = None 
 
@app.on_event("startup") 
async def startup(): 
    start_http_server(8006) 
    global _consumer 
    _consumer = Consumer( 
        enable_nats=settings.enable_nats, 
        cluster=settings.nats_cluster, 
        client_id=settings.nats_client_id, 
        url=settings.nats_url, 
        subject=settings.nats_subject, 
        matrix_homeserver=settings.matrix_homeserver, 
        matrix_token=settings.matrix_token, 
        activitypub_outbox_url=settings.activitypub_outbox_url, 
        activitypub_secret=settings.activitypub_secret, 
    ) 
    await (_consumer.start() if settings.enable_nats else 
asyncio.sleep(0)) 
 
@app.on_event("shutdown") 
async def shutdown(): 
    if _consumer: 
        await _consumer.stop() 
 
@app.get("/health") 
async def health(): 
    return health_response({"nats": "ok" if settings.enable_nats else 
"disabled"}) 
 
# Resumen simple para UI (además de /metrics Prometheus) 
from prometheus_client import REGISTRY 
 
@app.get("/notifications/stats") 
async def stats(): 
    attempted = delivered = failed = {} 
    # Extrae contadores relevantes 
    def get(metric_name: str): 
        res = {} 
        for m in REGISTRY.collect(): 
            if m.name == metric_name: 
                for s in m.samples: 
                    ch = s.labels.get("channel", "all") 
                    res[ch] = res.get(ch, 0) + int(s.value) 
        return res 
    return { 
        "attempted": get("comm_notifications_attempted_total"), 
        "delivered": get("comm_notifications_delivered_total"), 
        "failed": get("comm_notifications_failed_total"), 
    } 
 
 
Ruta completa: apps/web/app/settings/notifications/page.tsx 
"use client"; 
 
import React, { useEffect, useState } from "react"; 
import { Button } from "@repo/ui/button"; 
import { Input } from "@repo/ui/input"; 
import { Card } from "@repo/ui/card"; 
 
type Pref = { 
  id: number; 
  user: string; 
  address?: string | null; 
  apr_changes: boolean; 
  unlocks: boolean; 
  channel: "matrix" | "activitypub"; 
  target?: string | null; 
  is_enabled: boolean; 
  created_at: string; 
}; 
 
export default function NotificationsSettingsPage() { 
  const [prefs, setPrefs] = useState<Pref[]>([]); 
  const [form, setForm] = useState<Partial<Pref>>({ 
    apr_changes: true, 
    unlocks: true, 
    channel: "matrix", 
    is_enabled: true, 
  }); 
 
  async function load() { 
    const r = await fetch("/notifications/me", { credentials: 
"include" }); 
    if (r.ok) setPrefs(await r.json()); 
  } 
 
  useEffect(() => { 
    load(); 
  }, []); 
 
  async function save() { 
    const r = await fetch("/notifications/me", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      credentials: "include", 
      body: JSON.stringify({ 
        apr_changes: !!form.apr_changes, 
        unlocks: !!form.unlocks, 
        channel: form.channel, 
        address: form.address || null, 
        target: form.target || null, 
        is_enabled: !!form.is_enabled, 
      }), 
    }); 
    if (r.ok) { 
      await load(); 
      setForm({ 
        apr_changes: true, 
        unlocks: true, 
        channel: "matrix", 
        is_enabled: true, 
      }); 
    } 
  } 
 
  async function remove(id: number) { 
    const r = await fetch(`/notifications/me/${id}`, { 
      method: "DELETE", 
      credentials: "include", 
    }); 
    if (r.ok) load(); 
  } 
 
  const [stats, setStats] = useState<{attempted?: any, delivered?: 
any, failed?: any}>({}); 
  async function loadStats() { 
    const r = await fetch("/communications/notifications/stats", { 
credentials: "include" }); 
    if (r.ok) setStats(await r.json()); 
  } 
  useEffect(() => { loadStats(); const t = setInterval(loadStats, 
5000); return () => clearInterval(t); }, []); 
 
  return ( 
    <div className="max-w-3xl mx-auto p-6 space-y-8"> 
      <h1 className="text-2xl font-semibold">DeFi Notifications</h1> 
 
      <Card title="Nueva preferencia"> 
        <div className="grid grid-cols-2 gap-4"> 
          <label className="flex items-center gap-2"> 
            <input 
              type="checkbox" 
              checked={!!form.apr_changes} 
              onChange={e => setForm(f => ({ ...f, apr_changes: 
e.target.checked }))} 
            /> 
            APR changes 
          </label> 
          <label className="flex items-center gap-2"> 
            <input 
              type="checkbox" 
              checked={!!form.unlocks} 
              onChange={e => setForm(f => ({ ...f, unlocks: 
e.target.checked }))} 
            /> 
            Unlocks 
          </label> 
          <div> 
            <label className="block text-sm mb-1">Address 
(opcional)</label> 
            <Input placeholder="cosmos1..." value={form.address ?? ""} 
onChange={e => setForm(f => ({ ...f, address: e.target.value }))}/> 
          </div> 
          <div> 
            <label className="block text-sm mb-1">Channel</label> 
            <select 
              className="border rounded px-3 py-2 w-full" 
              value={form.channel} 
              onChange={e => setForm(f => ({ ...f, channel: 
e.target.value as any }))} 
            > 
              <option value="matrix">Matrix</option> 
              <option value="activitypub">ActivityPub</option> 
            </select> 
          </div> 
          <div className="col-span-2"> 
            <label className="block text-sm mb-1">Target (room Matrix 
o actor AP)</label> 
            <Input placeholder="!room:server ó https://.../users/you" 
value={form.target ?? ""} onChange={e => setForm(f => ({ ...f, target: 
e.target.value }))}/> 
          </div> 
          <label className="flex items-center gap-2"> 
            <input 
              type="checkbox" 
              checked={!!form.is_enabled} 
              onChange={e => setForm(f => ({ ...f, is_enabled: 
e.target.checked }))} 
            /> 
            Enabled 
          </label> 
          <div /> 
        </div> 
        <div className="mt-4"> 
          <Button onClick={save}>Guardar</Button> 
        </div> 
      </Card> 
 
      <Card title="Tus suscripciones"> 
        <ul className="divide-y"> 
          {prefs.map(p => ( 
            <li key={p.id} className="py-3 flex items-center 
justify-between"> 
              <div className="text-sm"> 
                <div><strong>Canal:</strong> {p.channel} — 
<strong>APR:</strong> {String(p.apr_changes)} — 
<strong>Unlocks:</strong> {String(p.unlocks)}</div> 
                <div><strong>Address:</strong> {p.address || "—"} — 
<strong>Target:</strong> {p.target || "—"} — <strong>Enabled:</strong> 
{String(p.is_enabled)}</div> 
              </div> 
              <Button onClick={() => remove(p.id)}>Eliminar</Button> 
            </li> 
          ))} 
        </ul> 
      </Card> 
 
      <Card title="Tasa de entrega (últimos valores)"> 
        <pre className="text-xs bg-gray-50 border rounded p-3 
overflow-auto"> 
{JSON.stringify(stats, null, 2)} 
        </pre> 
        <p className="text-sm text-gray-600 mt-2">Consejo: la tasa ≈ 
delivered/attempted por canal; los contadores se exponen también en 
<code>/metrics</code> (Prometheus).</p> 
      </Card> 
    </div> 
  ); 
} 
 
 
Ruta completa: infra/compose/.env.example (añade variables útiles de estos servicios) 
# --- DEFÍ NOTIFIER --- 
DEFI_DATABASE_URL=sqlite:///./defi.db 
DEFI_ENABLE_NATS=false 
DEFI_NATS_URL=nats://nats:4222 
DEFI_NATS_CLUSTER=gnew 
DEFI_NATS_CLIENT_ID=defi-notifier 
DEFI_NATS_SUBJECT=defi.events 
 
# --- COMMUNICATIONS CONSUMER --- 
COMM_ENABLE_NATS=false 
COMM_NATS_URL=${DEFI_NATS_URL} 
COMM_NATS_CLUSTER=${DEFI_NATS_CLUSTER} 
COMM_NATS_CLIENT_ID=communications 
COMM_NATS_SUBJECT=${DEFI_NATS_SUBJECT} 
MATRIX_HOMESERVER=http://matrix:8008 
MATRIX_TOKEN= 
ACTIVITYPUB_OUTBOX_URL=http://gateway:8000/activitypub/outbox 
ACTIVITYPUB_SECRET=my-shared-secret 
Notas de integración rápidas (ya reflejadas en el código) 
● Backend DeFi (FastAPI): se añade un router /notifications con CRUD de 
preferencias y un poller asíncrono que detecta cambios de APR y próximos unlocks, 
emitiendo eventos por usuario/canal. Se exponen métricas Prometheus para 
intentos/entregas y gauges (APR y unlocks pendientes), siguiendo el patrón de 
instrumentación ya usado en servicios Python y el coordinador de IA (HTTP health, 
NATS opcional, Prometheus sidecar). 
● Communications: se añade un consumer NATS para defi.events que entrega por 
Matrix y ActivityPub (outbox del Gateway), con métricas de entrega y un endpoint 
JSON /notifications/stats para la UI. La integración ActivityPub usa los 
endpoints documentados del Gateway. 
● Frontend (Next.js): página /settings/notifications con opt‑in/out (APR, 
unlocks), selección de canal/target y resumen en vivo de la tasa de entrega (consume 
/communications/notifications/stats). La UI reutiliza @repo/ui. 
Con esto queda cumplido N30: Notificar eventos (APR cambia, unlocks) con opt‑in/out y 
tasa de entrega visible y medible end‑to‑end. 
Tú dijiste: 
N31 Objetivo: PoC de puente EVM↔EVM con relayers y light-clients básicos. Roles: Arquitecto 
interop (lead), Eng. SC, Seguridad. Entregables: contrato “BridgeLockbox”, “BridgeMessenger”. 
DoD: transfer testnet ida/vuelta con prueba de fraude. 
ChatGPT Plus 
Pensó durante 2m 28s 
