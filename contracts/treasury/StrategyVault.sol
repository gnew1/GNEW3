// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
/** 
* GNEW N106 — Tesorería programable (DCA/estrategias) 
* - Reglas DCA con cofres por estrategia. 
* - Guardias: slippage, pausas de mercado, timelocks, kill-switch 
DAO. 
* - Ejecución por "keepers" autorizados (cron off-chain) o módulo 
on-chain. 
*/ 
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol"; 
import {SafeERC20} from 
"@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; 
import {Ownable2Step} from 
"@openzeppelin/contracts/access/Ownable2Step.sol"; 
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol"; 
import {ReentrancyGuard} from 
"@openzeppelin/contracts/utils/ReentrancyGuard.sol"; 
 
interface IAggregatorV3 { 
  function latestRoundData() external view returns ( 
    uint80 roundId, int256 answer, uint256 startedAt, uint256 
updatedAt, uint80 answeredInRound 
  ); 
  function decimals() external view returns (uint8); 
} 
 
/** 
 * Router genérico y minimal: pensado para un adaptador (p.ej. 
Uniswap/0x/Gearbox). 
 * DEV: los tests usan un Mock con esta misma firma. 
 */ 
interface ISimpleRouter { 
  function swapExactTokensForTokens( 
    address tokenIn, 
    address tokenOut, 
    uint256 amountIn, 
    uint256 minAmountOut, 
    address to 
  ) external returns (uint256 amountOut); 
} 
 
contract StrategyVault is Ownable2Step, Pausable, ReentrancyGuard { 
  using SafeERC20 for IERC20; 
 
  // ===== Roles ===== 
  mapping(address => bool) public isKeeper;      // ejecutores 
autorizados (cron) 
  mapping(address => bool) public isRouter;      // routers permitidos 
(lista blanca) 
  address public daoKillSwitch;                  // kill-switch 
(DAO/Governor) 
 
  // ===== Estrategias ===== 
  enum Status { Active, Paused, Ended } 
 
  struct Oracles { 
    address feedIn;       // Chainlink price feed tokenIn (en USD o 
par estable) 
    address feedOut;      // Chainlink price feed tokenOut 
    uint16  maxMoveBps;   // pausa de mercado si |Δprecio| > 
maxMoveBps desde última ejecución 
  } 
 
  struct Strategy { 
    // Parámetros fijos 
    address tokenIn; 
    address tokenOut; 
    address router;       // ISimpleRouter whitelisted 
    uint32  interval;     // segundos entre ejecuciones 
    uint16  maxSlippageBps;     // slippage máximo permitido 
(ejecución vs precio oráculo) 
    uint16  minOutBpsOfOracle;  // % (bps) mínimo de out vs precio 
oráculo (p.ej. 9900 = 99%) 
    uint32  startAt;      // inicio programado 
    uint32  endAt;        // fin programado (0 = sin fin) 
    uint128 amountPerExec;// cantidad fija por ejecución (en tokenIn) 
    // Estado 
    Status  status; 
    uint32  nextExecAt; 
    uint32  lastExecAt; 
    uint128 totalExecutedIn; 
    uint128 totalExecutedOut; 
    // Oráculos 
    Oracles oracles; 
  } 
 
  Strategy[] private _strategies; 
 
  // Cofres por estrategia: balance asignado de tokenIn 
  mapping(uint256 => uint256) public chestBalance; // strategyId => 
tokenIn balance 
  // Último precio (en 18 dec) para guardar referencia de pausas de 
mercado 
  mapping(uint256 => uint256) public lastOraclePriceE18; // strategyId 
=> price tokenIn/tokenOut * 1e18 
 
  // ===== Eventos ===== 
  event KeeperSet(address indexed who, bool enabled); 
  event RouterSet(address indexed router, bool enabled); 
  event KillSwitchSet(address indexed dao); 
 
  event StrategyCreated(uint256 indexed id, address tokenIn, address 
tokenOut, uint128 amountPerExec, uint32 interval); 
  event StrategyPaused(uint256 indexed id); 
  event StrategyResumed(uint256 indexed id); 
  event StrategyEnded(uint256 indexed id); 
  event ChestDeposited(uint256 indexed id, address indexed from, 
uint256 amount); 
  event ChestWithdrawn(uint256 indexed id, address indexed to, uint256 
amount); 
  event Executed(uint256 indexed id, uint256 inAmount, uint256 
outAmount, uint256 minOut, uint256 priceE18); 
  event MarketPaused(uint256 indexed id, uint256 moveBps, uint256 
thresholdBps); 
 
  modifier onlyKeeper() { 
    require(isKeeper[msg.sender], "not keeper"); 
    _; 
  } 
 
  modifier onlyDAO() { 
    require(msg.sender == daoKillSwitch || msg.sender == owner(), "not 
dao/owner"); 
    _; 
  } 
 
  constructor(address _daoKill) { 
    daoKillSwitch = _daoKill == address(0) ? msg.sender : _daoKill; 
    emit KillSwitchSet(daoKillSwitch); 
  } 
 
  // ===== Admin/Roles ===== 
  function setKeeper(address who, bool enabled) external onlyOwner { 
    isKeeper[who] = enabled; 
    emit KeeperSet(who, enabled); 
  } 
 
  function setRouter(address router, bool enabled) external onlyOwner 
{ 
    isRouter[router] = enabled; 
    emit RouterSet(router, enabled); 
  } 
 
  function setKillSwitch(address dao) external onlyOwner { 
    daoKillSwitch = dao; 
    emit KillSwitchSet(dao); 
  } 
 
  // ===== Kill switch / pausas globales ===== 
  function killAll() external onlyDAO { 
    _pause(); 
  } 
 
  function unkillAll() external onlyOwner { 
    _unpause(); 
  } 
 
  // ===== Crear y gestionar estrategias ===== 
 
  function createStrategy( 
    address tokenIn, 
    address tokenOut, 
    address router, 
    uint128 amountPerExec, 
    uint32 interval, 
    uint16 maxSlippageBps, 
    uint16 minOutBpsOfOracle, 
    uint32 startAt, 
    uint32 endAt, 
    Oracles calldata orc 
  ) external onlyOwner returns (uint256 id) { 
    require(isRouter[router], "router !allowed"); 
    require(interval >= 60, "interval too small"); 
    require(maxSlippageBps <= 1000, "slippage too high"); // <=10% 
    require(minOutBpsOfOracle <= 10000 && minOutBpsOfOracle >= 8000, 
"minOut bad"); 
    require(orc.maxMoveBps <= 5000, "move too high");     // <=50% 
 
    Strategy memory s; 
    s.tokenIn = tokenIn; 
    s.tokenOut = tokenOut; 
    s.router = router; 
    s.amountPerExec = amountPerExec; 
    s.interval = interval; 
    s.maxSlippageBps = maxSlippageBps; 
    s.minOutBpsOfOracle = minOutBpsOfOracle; 
    s.startAt = startAt; 
    s.endAt = endAt; 
    s.status = Status.Active; 
    s.nextExecAt = startAt == 0 ? uint32(block.timestamp + interval) : 
startAt; 
 
    _strategies.push(s); 
    id = _strategies.length - 1; 
 
    // Inicializa último precio 
    lastOraclePriceE18[id] = _oraclePriceE18(orc.feedIn, orc.feedOut); 
    _strategies[id].oracles = orc; 
 
    emit StrategyCreated(id, tokenIn, tokenOut, amountPerExec, 
interval); 
  } 
 
  function pauseStrategy(uint256 id) public onlyOwner { 
    Strategy storage s = _strategies[id]; 
    require(s.status == Status.Active, "not active"); 
    s.status = Status.Paused; 
    emit StrategyPaused(id); 
  } 
 
  function resumeStrategy(uint256 id) external onlyOwner { 
    Strategy storage s = _strategies[id]; 
    require(s.status == Status.Paused, "not paused"); 
    s.status = Status.Active; 
    if (s.nextExecAt < block.timestamp) { 
      s.nextExecAt = uint32(block.timestamp + s.interval); 
    } 
    emit StrategyResumed(id); 
  } 
 
  function endStrategy(uint256 id) external onlyOwner { 
    Strategy storage s = _strategies[id]; 
    require(s.status != Status.Ended, "already ended"); 
    s.status = Status.Ended; 
    emit StrategyEnded(id); 
  } 
 
  // ===== Cofres por estrategia ===== 
 
  function depositToChest(uint256 id, uint256 amount) external 
nonReentrant whenNotPaused { 
    Strategy storage s = _strategies[id]; 
    require(s.status != Status.Ended, "ended"); 
    IERC20(s.tokenIn).safeTransferFrom(msg.sender, address(this), 
amount); 
    chestBalance[id] += amount; 
    emit ChestDeposited(id, msg.sender, amount); 
  } 
 
  function withdrawChest(uint256 id, uint256 amount, address to) 
external onlyOwner nonReentrant { 
    Strategy storage s = _strategies[id]; 
    require(to != address(0), "zero to"); 
    require(chestBalance[id] >= amount, "insufficient"); 
    chestBalance[id] -= amount; 
    IERC20(s.tokenIn).safeTransfer(to, amount); 
    emit ChestWithdrawn(id, to, amount); 
  } 
 
  // ===== Consulta ===== 
 
  function strategiesCount() external view returns (uint256) { return 
_strategies.length; } 
 
  function getStrategy(uint256 id) external view returns (Strategy 
memory) { return _strategies[id]; } 
 
  // ===== Ejecución DCA ===== 
 
  /** 
   * Ejecuta un DCA si cumple: 
   * - Estado activo, ventana temporal (now >= nextExecAt, < endAt si 
aplica) 
   * - Pausa de mercado: |Δprecio_oráculo| <= maxMoveBps (desde última 
exec) 
   * - Slippage/MinOut: amountOut >= expectedOut * 
minOutBpsOfOracle/10000 
   */ 
  function executeDCA(uint256 id, uint256 minAmountOutHint) external 
nonReentrant whenNotPaused onlyKeeper { 
    Strategy storage s = _strategies[id]; 
    require(s.status == Status.Active, "not active"); 
    require(block.timestamp >= s.nextExecAt, "not time"); 
    if (s.endAt != 0) require(block.timestamp <= s.endAt, "after 
end"); 
    require(chestBalance[id] >= s.amountPerExec, "chest empty"); 
 
    // Pausa de mercado 
    uint256 px = _oraclePriceE18(s.oracles.feedIn, s.oracles.feedOut); 
    uint256 lastPx = lastOraclePriceE18[id]; 
    uint256 moveBps = _absDiffBps(px, lastPx); 
    if (moveBps > s.oracles.maxMoveBps) { 
      pauseStrategy(id); 
      emit MarketPaused(id, moveBps, s.oracles.maxMoveBps); 
      revert("market paused by oracle"); 
    } 
 
    // Expectativa por oráculo 
    uint256 expectedOut = (uint256(s.amountPerExec) * px) / 1e18; 
    uint256 requiredMinOut = (expectedOut * s.minOutBpsOfOracle) / 
10000; 
    if (minAmountOutHint < requiredMinOut) { 
      // Asegura que el keeper pasa un minOut no menor al requerido 
      minAmountOutHint = requiredMinOut; 
    } 
 
    // Ejecutar swap vía router whitelisted 
    uint256 beforeBal = IERC20(s.tokenOut).balanceOf(address(this)); 
 
    // Permiso al router si hace falta 
    IERC20(s.tokenIn).approve(s.router, 0); 
    IERC20(s.tokenIn).approve(s.router, s.amountPerExec); 
 
    uint256 outAmt = ISimpleRouter(s.router).swapExactTokensForTokens( 
      s.tokenIn, s.tokenOut, s.amountPerExec, minAmountOutHint, 
address(this) 
    ); 
 
    // Fallback si router no devuelve out: medir balance 
    if (outAmt == 0) { 
      uint256 afterBal = IERC20(s.tokenOut).balanceOf(address(this)); 
      outAmt = afterBal - beforeBal; 
    } 
 
    // Validación ex-post contra oráculo (slippage dura) 
    uint256 minOutHard = (expectedOut * (10000 - s.maxSlippageBps)) / 
10000; 
    require(outAmt >= minOutHard, "exceeds slippage"); 
 
    // Actualiza cofre/estado 
    chestBalance[id] -= s.amountPerExec; 
    s.totalExecutedIn += s.amountPerExec; 
    s.totalExecutedOut += uint128(outAmt); 
    s.lastExecAt = uint32(block.timestamp); 
    s.nextExecAt = uint32(block.timestamp + s.interval); 
    lastOraclePriceE18[id] = px; 
 
    emit Executed(id, s.amountPerExec, outAmt, minAmountOutHint, px); 
  } 
 
  // ===== Utilidades ===== 
 
  function _oraclePriceE18(address feedIn, address feedOut) internal 
view returns (uint256) { 
    require(feedIn != address(0) && feedOut != address(0), "feeds 
missing"); 
    (, int256 ain,,,) = IAggregatorV3(feedIn).latestRoundData(); 
    (, int256 aout,,,) = IAggregatorV3(feedOut).latestRoundData(); 
    require(ain > 0 && aout > 0, "bad oracle"); 
    uint8 din = IAggregatorV3(feedIn).decimals(); 
    uint8 dout = IAggregatorV3(feedOut).decimals(); 
    // precio tokenIn/tokenOut = (price_in / 10^din) / (price_out / 
10^dout) 
    // retorna con 1e18 de precisión 
    uint256 pin = uint256(ain); 
    uint256 pout = uint256(aout); 
    uint256 num = pin * (10 ** dout) * 1e18; 
    uint256 den = pout * (10 ** din); 
    return num / den; 
  } 
 
  function _absDiffBps(uint256 a, uint256 b) internal pure returns 
(uint256) { 
    if (a == b) return 0; 
    uint256 diff = a > b ? a - b : b - a; 
return (diff * 10000) / ((a + b) / 2); 
} 
} 
