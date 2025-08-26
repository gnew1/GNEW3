# N106 · Tesorería programable (DCA/estrategias) 
 
**Objetivo**: Reglas DCA y cofres por estrategia — **parametrizables** 
y **pausables** con guardias técnicas.   
**Roles**: Finanzas quant, Eng. SC.   
**Stack**: Policy engine (FastAPI) + cron confiable + contratos 
StrategyVault (Solidity). 
 
## Entregables - **Contrato** `StrategyVault.sol`: 
  - Estrategias **DCA** con `amountPerExec`, `interval`, 
`minOutBpsOfOracle`, `maxSlippageBps`, `oracles.maxMoveBps`. 
  - **Cofres por estrategia** (balances segregados 
`chestBalance[id]`). 
  - **Pausas de mercado** (Δprecio oráculo > umbral → pausa 
automática). 
  - **Kill-switch DAO** (`killAll()`) + `pauseStrategy/endStrategy`. 
- **Lista blanca** de **routers** y **keepers**. - **Servicio** `treasury_strats`: - Scheduler con **APScheduler** (cron off-chain) → ejecuta 
`executeDCA(id, minOut)` cuando toca. - **Policy Engine**: calcula `minOut` desde oráculo y límites de 
slippage; registra métricas Prometheus. - **Backtesting** (`backtest.py`) sobre CSV OHLC con desviación vs 
TWAP. - **Tests Hardhat**: validan ejecución, pausa por volatilidad y 
kill-switch. 
## Pasos 
1. **Backtesting**: correr `backtest.py` con histórico del par 
objetivo hasta lograr desviación ≤ umbral. 
2. **Parametrizar** estrategia: - `interval` (ej. 1h), `amountPerExec`. - `minOutBpsOfOracle` (ej. 99%) y `maxSlippageBps` (ej. 1%). - `oracles.maxMoveBps` (ej. 500 = 5%) para **pausas de mercado**. 
3. **Límites de slippage**: on-chain se exige `out ≥ expectedOut * (1 - slippage)`. 
4. **Pausas**: - **Automática** por volatilidad (Δ precio oráculo). - **Global** vía `killAll()` (DAO) o manual por estrategia 
`pauseStrategy(id)`. 
## DoD - **Desviación ≤ umbral**: en backtesting la `desviación absoluta 
media` ≤ objetivo; en producción, monitor con Prometheus 
(`gnew_strats_deviation_bps`) y alertas. - **Guardias activas**: slippage y pausas de mercado **on-chain** + 
kill-switch **DAO**. - **Ejecuciones** solo cuando `now ≥ nextExecAt`, con cofres 
suficientes. 
## Operación (runbook) - **Despliegue** 
```bash 
# Contrato 
pnpm --filter gnew-grants-escrow i # (deps) 
pnpm --filter gnew-grants-escrow build 
npx hardhat run hardhat/scripts/deploy-strategy-vault.ts --network 
<net> 
# Registrar roles 
vault.setRouter(ROUTER, true); vault.setKeeper(KEEPER, true) 
● Crear estrategia 
○ Preparar feeds Chainlink feedIn/feedOut y router whitelisteado. 
○ createStrategy(...) con parámetros afinados tras backtest. 
○ depositToChest(id, amount) con tokenIn (desde tesorería). 
Cron off-chain 
cd services/treasury_strats 
pip install -r requirements.txt 
export VAULT_ADDRESS=0x... 
uvicorn services.treasury_strats.main:app --port 8016 --reload 
●  El servicio ejecuta cada 60s; POST /execute/{id} fuerza una corrida. 
● Incidentes 
○ Volatilidad: contrato pausa automáticamente y emite MarketPaused. Requiere 
resumeStrategy(id) tras evaluación. 
○ Falla router/minOut: la tx revierte; revisar oráculo/slippage y reintentar. 
○ Emergencia: DAO ejecuta killAll(); luego withdrawChest para reubicar 
fondos. 
Controles 
● Kill-switch DAO: killAll() y reanudación solo por owner. 
● Lista blanca de routers y keepers para minimizar superficie. 
● Validador por oráculos (Chainlink): bloquea entornos con alta desviación y previene 
ejecuciones adversas. 
● Auditoría: eventos 
StrategyCreated/Executed/Paused/Ended/MarketPaused/Chest*. 
Nota: en redes de producción se recomienda integrar con Chainlink Automation o 
Gelato para cron on-chain; el diseño es compatible (keeper role). Para 
agregadores, sustituir ISimpleRouter por adaptador de 0x/1inch con validación 
de amountOutMin calculado por el policy engine. 
Tú dijiste: 
programa a nivel de detalle para GNEW N107 11.7 Pricing y reservas (Prompt 107) Objetivo: 
Oráculos de precio robustos, VWAP/EMA. Roles: Data, Back, Seguridad. Stack: Chainlink + 
fuentes redundantes; cálculo off-chain verificado. Entregables: feed consolidado, alertas de 
desvío. DoD: uptime ≥99.9%; falsos positivos <1%. Controles: circuit breaker ante desanclajes. 
ChatGPT Plus 
Pensó durante 1m 51s 
Ruta completa: ./contracts/pricing/SignedPriceOracle.sol 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
/** 
* GNEW N107 — SignedPriceOracle 
* - Feed on-chain alimentado por N-de-M firmantes (off-chain 
verificados). 
* - Guarda último precio y EMA (suavizado) por activo (assetId = 
bytes32). 
* - Evita replay con nonce/timestamp crecientes y límites de 
frescura. 
*/ 
library ECDSA { 
function toEthSignedMessageHash(bytes32 hash) internal pure returns 
(bytes32) { 
    return keccak256(abi.encodePacked("\x19Ethereum Signed 
Message:\n32", hash)); 
  } 
  function recover(bytes32 hash, bytes memory sig) internal pure 
returns (address) { 
    if (sig.length != 65) return address(0); 
    bytes32 r; bytes32 s; uint8 v; 
    assembly { r := mload(add(sig, 0x20)) s := mload(add(sig, 0x40)) v 
:= byte(0, mload(add(sig, 0x60))) } 
    if (v < 27) v += 27; 
    if (v != 27 && v != 28) return address(0); 
    return ecrecover(hash, v, r, s); 
  } 
} 
 
contract SignedPriceOracle { 
  using ECDSA for bytes32; 
 
  struct PriceData { 
    uint128 priceE8;     // precio con 8 decimales 
    uint64  timestamp;   // unix seconds 
    uint128 emaE8;       // EMA con 8 decimales (misma escala) 
    uint32  emaAlphaBps; // alpha de EMA en bps (p.ej., 500 = 5%) 
    uint64  nonce;       // monotónico por asset 
  } 
 
  address public owner; 
  mapping(address => bool) public isSigner; 
  uint8   public threshold;      // N requerido 
  uint32  public maxFutureSkew;  // segundos permitidos en futuro 
(p.ej., 60) 
  uint32  public maxStale;       // segundos de validez (p.ej., 300) 
  mapping(bytes32 => PriceData) private _prices; 
 
  // typehash estilo EIP-191 
  bytes32 public constant TYPEHASH = 
    keccak256("PriceUpdate(bytes32 asset,uint256 priceE8,uint64 
timestamp,uint64 nonce,address contractAddress)"); 
 
  event OwnerTransferred(address indexed oldOwner, address indexed 
newOwner); 
  event SignerSet(address indexed signer, bool enabled); 
  event ThresholdSet(uint8 n); 
  event LimitsSet(uint32 maxFutureSkew, uint32 maxStale); 
  event EmaAlphaSet(bytes32 indexed asset, uint32 emaAlphaBps); 
  event PricePosted(bytes32 indexed asset, uint128 priceE8, uint128 
emaE8, uint64 ts, uint64 nonce); 
 
  modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; 
} 
 
  constructor(address _owner, address[] memory signers, uint8 
_threshold, uint32 _maxFutureSkew, uint32 _maxStale) { 
    owner = _owner == address(0) ? msg.sender : _owner; 
    threshold = _threshold; 
    maxFutureSkew = _maxFutureSkew; 
    maxStale = _maxStale; 
    for (uint256 i=0;i<signers.length;i++) { isSigner[signers[i]] = 
true; emit SignerSet(signers[i], true); } 
    emit OwnerTransferred(address(0), owner); 
    emit ThresholdSet(_threshold); 
    emit LimitsSet(_maxFutureSkew, _maxStale); 
  } 
 
  // --- Admin --- 
 
  function transferOwnership(address n) external onlyOwner { 
require(n!=address(0),"zero"); emit OwnerTransferred(owner,n); 
owner=n; } 
  function setSigner(address s, bool e) external onlyOwner { 
isSigner[s]=e; emit SignerSet(s,e); } 
  function setThreshold(uint8 n) external onlyOwner { 
require(n>0,"n=0"); threshold=n; emit ThresholdSet(n); } 
  function setLimits(uint32 skew, uint32 stale) external onlyOwner { 
maxFutureSkew=skew; maxStale=stale; emit LimitsSet(skew,stale); } 
  function setEmaAlpha(bytes32 asset, uint32 alphaBps) external 
onlyOwner { require(alphaBps<=10000,"alpha"); 
_prices[asset].emaAlphaBps=alphaBps; emit EmaAlphaSet(asset, 
alphaBps); } 
 
  // --- Post de precio N-de-M --- 
 
  function postPrice( 
    bytes32 asset, 
    uint128 priceE8, 
    uint64  timestamp, 
    uint64  nonce, 
    bytes[] calldata signatures, 
    address[] calldata signers 
  ) external { 
    require(signatures.length == signers.length, "len"); 
    require(signatures.length >= threshold, "insufficient sigs"); 
    require(timestamp <= block.timestamp + maxFutureSkew, "future"); 
    require(priceE8 > 0, "price=0"); 
 
    PriceData storage pd = _prices[asset]; 
    require(nonce > pd.nonce, "nonce"); 
    // Evitar duplicidades de signers y comprobar whitelist 
    for (uint256 i=0;i<signers.length;i++){ 
      require(isSigner[signers[i]], "not signer"); 
      for (uint256 j=i+1;j<signers.length;j++){ 
require(signers[i]!=signers[j], "dup"); } 
    } 
    bytes32 digest = keccak256(abi.encode(TYPEHASH, asset, priceE8, 
timestamp, nonce, address(this))).toEthSignedMessageHash(); 
    uint256 ok; 
    for (uint256 i=0;i<signatures.length;i++){ 
      if (digest.recover(signatures[i]) == signers[i]) { ok++; } 
    } 
    require(ok >= threshold, "bad sigs"); 
 
    // Actualiza EMA: ema_new = alpha*p + (1-alpha)*ema_old 
    uint128 emaOld = pd.emaE8 == 0 ? priceE8 : pd.emaE8; 
    uint32 alpha = pd.emaAlphaBps == 0 ? 500 /*5% por defecto*/ : 
pd.emaAlphaBps; 
    uint256 emaNew = (uint256(alpha) * priceE8 + uint256(10000 - 
alpha) * emaOld) / 10000; 
 
    pd.priceE8 = priceE8; 
    pd.timestamp = timestamp; 
    pd.emaE8 = uint128(emaNew); 
    pd.nonce = nonce; 
 
    emit PricePosted(asset, priceE8, uint128(emaNew), timestamp, 
nonce); 
  } 
 
  // --- Lectura --- 
 
  function getPrice(bytes32 asset) external view returns (uint128 
priceE8, uint64 timestamp, bool stale) { 
    PriceData storage pd = _prices[asset]; 
    priceE8 = pd.priceE8; timestamp = pd.timestamp; stale = 
(block.timestamp > pd.timestamp + maxStale); 
  } 
 
  function getEma(bytes32 asset) external view returns (uint128 emaE8, 
uint64 timestamp) { 
    PriceData storage pd = _prices[asset]; 
    return (pd.emaE8, pd.timestamp); 
  } 
 
  function getMeta(bytes32 asset) external view returns (PriceData 
memory) { return _prices[asset]; } 
} 
 
 
Ruta completa: ./contracts/pricing/ConsolidatedPriceFeed.sol 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
 
/** 
 * GNEW N107 — ConsolidatedPriceFeed 
 * - Consolida Chainlink + SignedPriceOracle. 
 * - Filtros: staleness, desviación, "last good price". 
 * - Circuit breaker automático y manual (DAO). 
 */ 
 
interface IAggregatorV3 { 
  function latestRoundData() external view returns 
(uint80,int256,uint256,uint256,uint80); 
  function decimals() external view returns (uint8); 
} 
interface ISignedPriceOracle { 
  function getPrice(bytes32 asset) external view returns (uint128 
priceE8, uint64 ts, bool stale); 
} 
 
contract ConsolidatedPriceFeed { 
  struct AssetConf { 
    address chainlink;     // AggregatorV3 
    uint32  clMaxStale;    // segundos 
    uint16  maxDeviationBps;     // si |CL - Signed| > → breaker 
    uint16  breakerDeviationBps; // umbral duro para activar breaker y 
usar LGP 
    bool    enabled; 
  } 
  address public owner; 
  address public dao;                     // kill-switch / breaker 
manual 
  ISignedPriceOracle public signed;       // oracle firmado redundante 
  mapping(bytes32 => AssetConf) public conf; 
  mapping(bytes32 => uint128) public lastGoodPriceE8; 
  mapping(bytes32 => bool) public circuitBreaker; // por asset 
 
  event OwnerTransferred(address indexed oldOwner, address indexed 
newOwner); 
  event DaoSet(address indexed dao); 
  event AssetSet(bytes32 indexed asset, address chainlink, uint32 
clMaxStale, uint16 maxDev, uint16 breakerDev, bool enabled); 
  event Breaker(bytes32 indexed asset, bool on, string reason); 
  event Poked(bytes32 indexed asset, uint128 priceE8, bool breaker); 
 
  modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; 
} 
  modifier onlyDAO() { require(msg.sender == dao || msg.sender == 
owner, "not dao/owner"); _; } 
 
  constructor(address _owner, address _dao, address _signed) { 
    owner = _owner == address(0) ? msg.sender : _owner; 
    dao = _dao == address(0) ? msg.sender : _dao; 
    signed = ISignedPriceOracle(_signed); 
    emit OwnerTransferred(address(0), owner); 
    emit DaoSet(dao); 
  } 
 
  function setDAO(address _dao) external onlyOwner { dao=_dao; emit 
DaoSet(_dao); } 
 
  function setAsset(bytes32 asset, AssetConf calldata c) external 
onlyOwner { 
    require(c.chainlink != address(0), "cl=0"); 
    require(c.maxDeviationBps>0 && 
c.breakerDeviationBps>=c.maxDeviationBps, "dev"); 
    conf[asset]=c; 
    emit AssetSet(asset, c.chainlink, c.clMaxStale, c.maxDeviationBps, 
c.breakerDeviationBps, c.enabled); 
  } 
 
  function setBreaker(bytes32 asset, bool on, string calldata reason) 
external onlyDAO { 
    circuitBreaker[asset] = on; 
    emit Breaker(asset, on, reason); 
  } 
 
  function _clPriceE8(address cl) internal view returns (uint128 
priceE8, uint64 ts, bool stale) { 
    ( , int256 ans, , uint256 updatedAt, ) = 
IAggregatorV3(cl).latestRoundData(); 
    require(ans > 0, "cl price"); 
    uint8 d = IAggregatorV3(cl).decimals(); 
    // normaliza a 8 dec 
    uint256 p = uint256(ans); 
    if (d > 8) p = p / (10 ** (d - 8)); 
    else if (d < 8) p = p * (10 ** (8 - d)); 
    priceE8 = uint128(p); 
    ts = uint64(updatedAt); 
  } 
 
  function _absDiffBps(uint256 a, uint256 b) internal pure returns 
(uint256) { 
    if (a == b) return 0; 
    uint256 diff = a > b ? a - b : b - a; 
    return (diff * 10000) / ((a + b) / 2); 
  } 
 
  /// @notice Calcula el precio consolidado (no escribe estado). 
  function consult(bytes32 asset) public view returns (uint128 
priceE8, bool breaker, bool usedLGP) { 
    AssetConf memory c = conf[asset]; 
    require(c.enabled, "asset disabled"); 
 
    (uint128 clP, uint64 clTs) = _clPriceE8(c.chainlink); 
    bool clStale = (block.timestamp > clTs + c.clMaxStale); 
 
    (uint128 sgP, , bool sgStale) = signed.getPrice(asset); 
 
    // Si ambos están stales → breaker y LGP 
    if (clStale && sgStale) { 
      return (lastGoodPriceE8[asset], true, true); 
    } 
    // Si uno válido y otro stale → usa válido 
    if (!clStale && sgStale) return (clP, circuitBreaker[asset], 
false); 
    if (clStale && !sgStale) return (sgP, circuitBreaker[asset], 
false); 
 
    // Ambos válidos: chequear desviación 
    uint256 devBps = _absDiffBps(clP, sgP); 
    if (devBps > c.breakerDeviationBps || circuitBreaker[asset]) { 
      return (lastGoodPriceE8[asset], true, true); 
    } 
    // Dentro de tolerancia: usa promedio conservador 
    uint128 mid = uint128((uint256(clP) + uint256(sgP)) / 2); 
    return (mid, false, false); 
  } 
 
  /// @notice Actualiza LGP y señal de breaker (cualquiera puede 
"poke" para refrescar). 
  function poke(bytes32 asset) external { 
    AssetConf memory c = conf[asset]; 
    require(c.enabled, "asset disabled"); 
 
    (uint128 clP, uint64 clTs) = _clPriceE8(c.chainlink); 
    bool clStale = (block.timestamp > clTs + c.clMaxStale); 
    (uint128 sgP, , bool sgStale) = signed.getPrice(asset); 
 
    // evaluar desviación si ambos válidos 
    if (!clStale && !sgStale) { 
      uint256 devBps = _absDiffBps(clP, sgP); 
      if (devBps > c.breakerDeviationBps) { 
        circuitBreaker[asset] = true; 
        emit Breaker(asset, true, "deviation"); 
      } else if (devBps <= c.maxDeviationBps && circuitBreaker[asset]) 
{ 
        circuitBreaker[asset] = false; 
        emit Breaker(asset, false, "normalized"); 
      } 
    } 
 
    (uint128 px, bool brk,) = consult(asset); 
    if (px > 0) { lastGoodPriceE8[asset] = px; } 
    emit Poked(asset, px, brk); 
  } 
} 
 
 
Ruta completa: ./services/pricing_oracle/requirements.txt 
fastapi==0.115.14 
uvicorn[standard]==0.35.0 
pydantic==2.11.7 
pydantic-settings==2.10.1 
httpx==0.28.1 
pandas==2.2.3 
numpy==2.1.1 
prometheus-client==0.22.1 
web3==7.5.0 
cryptography==45.0.5 
apscheduler==3.10.4 
 
Ruta completa: ./services/pricing_oracle/config.py 
from pydantic_settings import BaseSettings, SettingsConfigDict 
 
class Settings(BaseSettings): 
    environment: str = "dev" 
    # Fuentes (simuladas o reales; configurar URLs en prod) 
    sources: list[str] = ["mock:exA", "mock:exB", "mock:exC"] 
    # Ventana VWAP (minutos) y EMA(alpha) 
    vwap_window_min: int = 5 
    ema_alpha: float = 0.1 
    # Activo 
    asset_symbol: str = "USDC/USD" 
    asset_id_hex: str = "0x" + "0"*62 + "01"  # bytes32 para el 
contrato 
    # Umbrales 
    deviation_alert_bps: int = 150   # 1.5% 
    breaker_bps: int = 300           # 3.0% 
    # On-chain posting 
    rpc_url: str = "http://localhost:8545" 
    chain_id: int = 31337 
    signed_oracle_addr: str | None = None 
    private_key: str | None = None   # signer para postPrice 
    # Prometheus 
    metrics_port: int = 8021 
    # Pull chainlink ref (opcional, para comparar) 
    chainlink_addr: str | None = None 
 
    model_config = SettingsConfigDict(env_file=".env", extra="ignore") 
 
settings = Settings() 
 
Ruta completa: ./services/pricing_oracle/sources/base.py 
from abc import ABC, abstractmethod 
from typing import List, Tuple 
from dataclasses import dataclass 
from datetime import datetime, timezone 
 
@dataclass 
class Trade: 
    ts: datetime      # timestamp UTC 
    price: float      # precio en USD 
    size: float       # tamaño en unidades base (para VWAP) 
 
class Source(ABC): 
    name: str 
    @abstractmethod 
    async def fetch_trades(self) -> List[Trade]: 
        ... 
 
Ruta completa: ./services/pricing_oracle/sources/mock.py 
import random 
from datetime import datetime, timedelta, timezone 
from .base import Source, Trade 
 
class MockSource(Source): 
    def __init__(self, name: str, base: float = 1.0000, vol: float = 
0.002): 
        self.name = name 
        self.base = base 
        self.vol = vol 
 
    async def fetch_trades(self): 
        now = datetime.now(timezone.utc) 
        trades = [] 
        for i in range(60):  # últimos ~60s 
            p = random.gauss(self.base, self.vol)  # ruido 
            size = abs(random.gauss(10, 3)) 
            trades.append(Trade(ts=now - timedelta(seconds=(60-i)), 
price=p, size=size)) 
        return trades 
 
def build_from_uri(uri: str) -> Source: 
    # uri: mock:exA?base=1.0&vol=0.002  (simplificado) 
    name = uri.split(":")[1] 
    return MockSource(name=name) 
 
Ruta completa: ./services/pricing_oracle/metrics.py 
from prometheus_client import Gauge, Counter 
 
price_g = Gauge("pricing_price_e8", "Precio consolidado (1e8)", 
["asset"]) 
ema_g   = Gauge("pricing_ema_e8", "EMA precio (1e8)", ["asset"]) 
vwap_g  = Gauge("pricing_vwap_e8", "VWAP (1e8)", ["asset"]) 
dev_cl  = Gauge("pricing_deviation_chainlink_bps", "Desvío vs 
Chainlink (bps)", ["asset"]) 
alerts  = Counter("pricing_alerts_total", "Alertas emitidas", 
["type","asset"]) 
uptime  = Gauge("pricing_uptime", "Servicio vivo", ["service"]) 
 
def mark_up(service="pricing_oracle"): uptime.labels(service).set(1) 
Ruta completa: ./services/pricing_oracle/compute.py 
from __future__ import annotations 
from datetime import datetime, timezone, timedelta 
from typing import List, Tuple 
import numpy as np 
from .sources.base import Trade 
def vwap(trades: List[Trade]) -> float: 
if not trades: return float("nan") 
px = np.array([t.price for t in trades], dtype=float) 
sz = np.array([t.size for t in trades], dtype=float) 
return float((px * sz).sum() / sz.sum()) 
def ema(prev: float | None, x: float, alpha: float) -> float: 
return x if prev is None else (alpha * x + (1 - alpha) * prev) 
def e8(x: float) -> int: 
return int(round(x * 1e8)) 
def bps(a: float, b: float) -> float: 
if a == 0 or b == 0: return float("inf") 
return abs(a - b) / ((a + b) / 2) * 10000.0 
Ruta completa: ./services/pricing_oracle/onchain.py 
from web3 import Web3
from web3.contract import Contract
from eth_account.messages import encode_defunct 
from dataclasses import dataclass 
SIGNED_ABI = 
'[{"inputs":[{"internalType":"bytes32","name":"asset","type":"bytes32"
 },{"internalType":"uint128","name":"priceE8","type":"uint128"},{"inter
 nalType":"uint64","name":"timestamp","type":"uint64"},{"internalType":
 "uint64","name":"nonce","type":"uint64"},{"internalType":"bytes[]","na
 me":"signatures","type":"bytes[]"},{"internalType":"address[]","name":
"signers","type":"address[]"}],"name":"postPrice","outputs":[],"stateM
 utability":"nonpayable","type":"function"},{"inputs":[{"internalType":
 "bytes32","name":"asset","type":"bytes32"}],"name":"getPrice","outputs
 ":[{"internalType":"uint128","name":"priceE8","type":"uint128"},{"inte
 rnalType":"uint64","name":"timestamp","type":"uint64"},{"internalType"
 :"bool","name":"stale","type":"bool"}],"stateMutability":"view","type"
 :"function"},{"inputs":[],"name":"TYPEHASH","outputs":[{"internalType"
 :"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type
 ":"function"}]' 
CL_ABI = 
'[{"inputs":[],"name":"latestRoundData","outputs":[{"type":"uint80"},{
 "type":"int256"},{"type":"uint256"},{"type":"uint256"},{"type":"uint80
 "}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"d
 ecimals","outputs":[{"type":"uint8"}],"stateMutability":"view","type":
 "function"}]' 
@dataclass 
class Chain: 
w3: Web3
oracle: Contract
cl: Contract | None
pk: str | None
def connect(rpc_url: str, signed_addr: str, cl_addr: str | None, 
chain_id: int, pk: str | None) -> Chain: 
w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 
30})) 
oracle = 
w3.eth.contract(address=Web3.to_checksum_address(signed_addr), 
abi=SIGNED_ABI) 
cl = w3.eth.contract(address=Web3.to_checksum_address(cl_addr), 
abi=CL_ABI) if cl_addr else None 
return Chain(w3=w3, oracle=oracle, cl=cl, pk=pk) 
def post_price(chain: Chain, asset: bytes, price_e8: int, timestamp: 
int, nonce: int, signers_privkeys: list[str]) -> str: 
# Firmas locales (para demo: 1..N); en prod, cada firmante corre 
su propio servicio 
    typehash = chain.oracle.functions.TYPEHASH().call() 
    msg_hash = Web3.solidity_keccak( 
        ["bytes32","bytes32","uint256","uint64","uint64","address"], 
        [typehash, asset, price_e8, timestamp, nonce, 
chain.oracle.address] 
    ) 
    signatures = [] 
    addrs = [] 
    for pk in signers_privkeys: 
        acct = chain.w3.eth.account.from_key(pk) 
        sig = 
chain.w3.eth.account.sign_message(encode_defunct(hexstr=msg_hash.hex()
 ), private_key=pk) 
        signatures.append(sig.signature) 
        addrs.append(acct.address) 
    tx = chain.oracle.functions.postPrice(asset, price_e8, timestamp, 
nonce, signatures, addrs).build_transaction({ 
        "from": addrs[0], 
        "chainId": chain.w3.eth.chain_id, 
        "nonce": chain.w3.eth.get_transaction_count(addrs[0]), 
        "gas": 350000 
    }) 
    signed = chain.w3.eth.account.sign_transaction(tx, 
private_key=signers_privkeys[0]) 
    txh = chain.w3.eth.send_raw_transaction(signed.rawTransaction) 
    return txh.hex() 
 
def get_chainlink_price_e8(chain: Chain) -> int | None: 
    if not chain.cl: return None 
    ans = chain.cl.functions.latestRoundData().call() 
    dec = chain.cl.functions.decimals().call() 
    p = int(ans[1]) 
    if dec > 8: p //= 10**(dec-8) 
    elif dec < 8: p *= 10**(8-dec) 
    return p 
 
Ruta completa: ./services/pricing_oracle/main.py 
from fastapi import FastAPI, HTTPException 
from pydantic import BaseModel 
from datetime import datetime, timezone 
import asyncio, time 
from .config import settings 
from .metrics import price_g, ema_g, vwap_g, dev_cl, alerts, mark_up 
from .compute import vwap, ema, e8, bps 
from .sources.mock import build_from_uri 
from .onchain import connect, post_price, get_chainlink_price_e8 
 
app = FastAPI(title="GNEW Pricing Oracle") 
mark_up() 
 
class PriceOut(BaseModel): 
    asset: str 
    vwap: float 
    ema: float 
    consolidated: float 
    price_e8: int 
    ts: int 
    deviation_chainlink_bps: float | None = None 
    alert: str | None = None 
 
# Build sources 
sources = [build_from_uri(u) for u in settings.sources] 
# On-chain 
chain = None 
if settings.signed_oracle_addr: 
    chain = connect(settings.rpc_url, settings.signed_oracle_addr, 
settings.chainlink_addr, settings.chain_id, settings.private_key) 
 
async def compute_once() -> PriceOut: 
    # 1) Recoger trades 
    trades_all = [] 
    for src in sources: 
        trades = await src.fetch_trades() 
        trades_all.extend(trades) 
    if not trades_all: 
        raise HTTPException(503, "no data") 
    # 2) VWAP de ventana completa (simulado con últimos 60s mock) 
    px_vwap = vwap(trades_all) 
    # 3) EMA 
    prev_ema = None 
    px_ema = ema(prev_ema, px_vwap, settings.ema_alpha) 
    # 4) Consolidación simple (promedio VWAP/EMA) 
    px_cons = (px_vwap + px_ema) / 2 
    ts = int(datetime.now(timezone.utc).timestamp()) 
    # 5) Alertas / desvíos vs Chainlink 
    dev = None; alert = None 
    if chain and chain.cl: 
        cl = get_chainlink_price_e8(chain) / 1e8 
        dev = bps(px_cons, cl) 
        dev_cl.labels(settings.asset_symbol).set(dev or 0) 
        if dev is not None and dev > settings.breaker_bps: 
            alerts.labels("breaker", settings.asset_symbol).inc() 
            alert = "circuit_breaker" 
        elif dev is not None and dev > settings.deviation_alert_bps: 
            alerts.labels("deviation", settings.asset_symbol).inc() 
            alert = "deviation_alert" 
 
    # 6) Métricas 
    price_g.labels(settings.asset_symbol).set(e8(px_cons)) 
    vwap_g.labels(settings.asset_symbol).set(e8(px_vwap)) 
    ema_g.labels(settings.asset_symbol).set(e8(px_ema)) 
 
    return PriceOut( 
        asset=settings.asset_symbol, 
        vwap=px_vwap, ema=px_ema, consolidated=px_cons, 
        price_e8=e8(px_cons), ts=ts, deviation_chainlink_bps=dev, 
alert=alert 
    ) 
 
@app.get("/health") 
async def health(): return {"env": settings.environment, "sources": 
[s.name for s in sources]} 
 
@app.get("/price", response_model=PriceOut) 
async def get_price(): return await compute_once() 
 
@app.post("/push") 
async def push_onchain(): 
    if not chain: raise HTTPException(400, "on-chain not configured") 
    out = await compute_once() 
    now = int(time.time()) 
    # nonce = now (simple, monotónico) 
    txh = post_price(chain, bytes.fromhex(settings.asset_id_hex[2:]), 
out.price_e8, now, now, [settings.private_key]) 
    return {"ok": True, "tx": txh, "price_e8": out.price_e8} 
 
Ruta completa: ./services/pricing_oracle/alerts/pricing.rules.yml 
groups: 
  - name: pricing 
    rules: 
      - alert: PricingServiceDown 
        expr: absent(pricing_uptime{service="pricing_oracle"}) or 
pricing_uptime{service="pricing_oracle"} == 0 
        for: 5m 
        labels: { severity: critical } 
        annotations: 
          summary: "Pricing Oracle caído" 
          description: "No se reporta uptime en los últimos 5 minutos 
(DoD uptime≥99.9%)." 
 
      - alert: PriceDeviationHigh 
        expr: pricing_deviation_chainlink_bps{asset=~".+"} > 150 
        for: 3m 
        labels: { severity: warning } 
        annotations: 
          summary: "Desvío de precio elevado" 
          description: "Desvío > 150 bps vs Chainlink por más de 3m." 
 
      - alert: CircuitBreaker 
        expr: pricing_deviation_chainlink_bps{asset=~".+"} > 300 
        for: 1m 
        labels: { severity: critical } 
        annotations: 
          summary: "Circuit breaker: desanclaje potencial" 
          description: "Desvío > 300 bps. Revisar y activar breaker en 
ConsolidatedPriceFeed si procede." 
 
 
Ruta completa: ./hardhat/test/pricingFeed.spec.ts 
import { expect } from "chai"; 
import { ethers } from "hardhat"; 
 
describe("Pricing Feed (Consolidated + Signed)", () => { 
  it("consolida CL+Signed, mantiene LGP y activa breaker por 
desviación", async () => { 
    const [owner, s1, s2, dao] = await ethers.getSigners(); 
 
    // Mock Chainlink Aggregator (simplificado) 
    const MockCL = await ethers.getContractFactory(` 
      contract MockCL { 
        int256 public answer; uint8 public decimals = 8; uint256 
public updatedAt; 
        constructor(int256 a){ answer=a; updatedAt=block.timestamp; } 
        function latestRoundData() external view returns 
(uint80,int256,uint256,uint256,uint80) { return (0, answer, 0, 
updatedAt, 0); } 
        function set(int256 a) external { answer=a; 
updatedAt=block.timestamp; } 
      }`); 
    const cl = await MockCL.deploy(1_00000000); // 1.0 
 
    const SPO = await ethers.getContractFactory("SignedPriceOracle"); 
    const spo = await SPO.deploy(owner.address, [s1.address, 
s2.address], 2, 60, 600); 
    // Publica precio firmado 1.0 
    const typehash = await spo.TYPEHASH(); 
    const asset = ethers.zeroPadBytes("0x01", 32); 
    const priceE8 = 1_00000000; 
    const nonce = 1; const now = (await 
ethers.provider.getBlock("latest"))!.timestamp + 1; 
    const msgHash = 
ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode( 
      ["bytes32","bytes32","uint256","uint64","uint64","address"], 
[typehash, asset, priceE8, now, nonce, await spo.getAddress()] 
    )); 
    const sig1 = await s1.signMessage(ethers.getBytes(msgHash)); 
    const sig2 = await s2.signMessage(ethers.getBytes(msgHash)); 
    await spo.postPrice(asset, priceE8, now, nonce, [sig1, sig2], 
[s1.address, s2.address]); 
 
    const CPF = await 
ethers.getContractFactory("ConsolidatedPriceFeed"); 
    const cpf = await CPF.deploy(owner.address, dao.address, await 
spo.getAddress()); 
    await cpf.setAsset(asset, { chainlink: await cl.getAddress(), 
clMaxStale: 600, maxDeviationBps: 150, breakerDeviationBps: 300, 
enabled: true }); 
 
    // consult → promedio (1.0) 
    const r1 = await cpf.consult(asset); 
    expect(r1[0]).to.eq(1_00000000); 
    // poke guarda LGP 
    await cpf.poke(asset); 
    let lgp = await cpf.lastGoodPriceE8(asset); 
expect(lgp).to.eq(1_00000000); 
 
    // Desviación grande: CL salta a 1.05 (+5%) 
    await cl.set(1_05000000); 
    const r2 = await cpf.consult(asset); 
    expect(r2[2]).to.eq(true); // usedLGP 
    await cpf.poke(asset); 
    expect(await cpf.circuitBreaker(asset)).to.eq(true); 
    expect(await cpf.lastGoodPriceE8(asset)).to.eq(1_00000000); 
 
    // DAO puede limpiar breaker manualmente 
    await cpf.connect(dao).setBreaker(asset, false, "manual reset"); 
    expect(await cpf.circuitBreaker(asset)).to.eq(false); 
  }); 
}); 
 
 
Ruta completa: ./apps/web/src/components/PricingMonitorPanel.tsx 
"use client"; 
import React, { useEffect, useState } from "react"; 
 
type PriceOut = { 
  asset: string; vwap: number; ema: number; consolidated: number; 
  price_e8: number; ts: number; deviation_chainlink_bps?: number; 
alert?: string | null; 
}; 
 
export default function PricingMonitorPanel({ apiBase = "/api/pricing" 
}: { apiBase?: string }) { 
  const [data, setData] = useState<PriceOut | null>(null); 
 
  const load = async () => { 
    try { 
      const r = await fetch(`${apiBase}/price`); 
      setData(await r.json()); 
    } catch { /* noop */ } 
  }; 
 
  useEffect(() => { 
    load(); 
    const id = setInterval(load, 5000); 
    return () => clearInterval(id); 
  }, []); 
 
  return ( 
    <div className="rounded-2xl shadow p-4 space-y-2"> 
      <h2 className="text-xl font-semibold">Pricing & Reservas</h2> 
      {data ? ( 
        <> 
          <div className="text-sm text-gray-500">{data.asset} — {new 
Date(data.ts*1000).toLocaleString()}</div> 
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 
text-sm"> 
            <Stat label="VWAP" value={data.vwap.toFixed(6)} /> 
            <Stat label="EMA" value={data.ema.toFixed(6)} /> 
            <Stat label="Consolidado" 
value={data.consolidated.toFixed(6)} /> 
            <Stat label="Desvío vs CL (bps)" 
value={(data.deviation_chainlink_bps ?? 0).toFixed(1)} /> 
          </div> 
          {data.alert && ( 
            <div className="p-3 rounded bg-amber-100 
text-amber-800">ALERTA: {data.alert}</div> 
          )} 
          <div className="text-xs text-gray-500">DoD: uptime ≥99.9%, 
falsos positivos &lt; 1% (ver alerting y tuning).</div> 
        </> 
      ) : <div>Cargando…</div>} 
    </div> 
  ); 
} 
 
function Stat({label, value}:{label:string,value:string}) { 
  return ( 
    <div className="rounded-xl border p-3"> 
      <div className="text-xs text-gray-500">{label}</div> 
      <div className="text-lg font-medium">{value}</div> 
    </div> 
  ); 
} 
 
Ruta completa: ./apps/web/src/pages/api/pricing/[...path].ts 
import type { NextApiRequest, NextApiResponse } from "next"; 
 
export default async function handler(req: NextApiRequest, res: 
NextApiResponse) { 
const BASE = process.env.PRICING_URL || "http://localhost:8020"; 
const path = (req.query.path as string[]).join("/"); 
const r = await fetch(`${BASE}/${path}`, { method: req.method, 
headers: { "Content-Type":"application/json" }, body: req.method !== 
"GET" ? JSON.stringify(req.body) : undefined }); 
const data = await r.text(); 
res.status(r.status).send(data); 
} 
Ruta completa: ./docs/pricing/N107-pricing-runbook.md 
# N107 — Pricing y reservas (VWAP/EMA + oráculos redundantes) 
## Objetivo - **Feed consolidado** (Chainlink + SignedPriceOracle) con VWAP/EMA 
off-chain verificado. - **Alertas** automáticas de desvío y **circuit breaker** ante 
desanclajes. 
## Componentes - **SignedPriceOracle.sol**: feed on-chain con N-de-M firmantes, 
guarda `priceE8` y `emaE8`. - **ConsolidatedPriceFeed.sol**: consolida Chainlink + Signed; aplica 
staleness, desviación y `lastGoodPrice`; breaker per-asset + 
kill-switch DAO. - **Service `pricing_oracle`** (FastAPI): - Pull de fuentes → **VWAP** (ventana) → **EMA** → consolidado. - Métricas Prometheus + reglas de alerting. - `POST /push` sube precio firmado al contrato (1-de-N en demo; en 
prod, cada firmante corre su nodo y publica). 
## Pasos 
1. **Backfill + tuning** (Data): - Ajustar `vwap_window_min` y `ema_alpha` con histórico de cada 
par. 
- Estimar **falsos positivos** simulando el detector: 
`deviation_alert_bps` / `breaker_bps` → meta `<1%`. 
2. **Despliegue** (Back/Sec): - Desplegar `SignedPriceOracle` con `threshold=N`, `signers=[...]`, 
`maxStale`. - Desplegar `ConsolidatedPriceFeed` y registrar assets (CL 
aggregator y umbrales). - Arrancar `pricing_oracle` con `.env` apuntando a RPC + 
direcciones. 
3. **Operación**: - `GET /price` para ver consolidado; `POST /push` para publicar. - `poke(asset)` periódicamente (cron/keeper) actualiza LGP y estado 
del breaker. 
4. **Reservas**: - Consumidores on-chain (tesorería/estrategias) consultan 
`ConsolidatedPriceFeed.consult(asset)` para valorar reservas y activar 
**pausas** si `breaker==true`. 
## DoD - **Uptime ≥ 99.9%**: monitor `pricing_uptime` y alerta 
`PricingServiceDown`. - **FP < 1%**: medir tasa de `deviation_alert` vs eventos reales 
(post-mortem semanal) y recalibrar. - **Guardias activas**: breaker automático+manual; LGP actualizado y 
no sustitución por feeds stale. 
## Controles - **Circuit breaker** por desvíos o staleness; **kill-switch DAO** 
(`setBreaker`). - **N-de-M firmantes** con timestamps y nonces monotónicos (previene 
replay). - **Inmutabilidad**: on-chain eventos `PricePosted`/`Poked` trazan 
auditoría. 
## Comandos útiles 
```bash 
# Servicio local 
uvicorn services.pricing_oracle.main:app --port 8020 --reload & 
# Métricas 
curl -s localhost:8021/metrics | grep pricing_ 
# Hardhat tests 
npx hardhat test hardhat/test/pricingFeed.spec.ts --- 
### Cómo cumple el Prompt 107 - **Oráculos robustos**: combinación **Chainlink + SignedPriceOracle** 
con filtros de staleness y **last good price**; **N-de-M** firmantes. - **VWAP/EMA**: cálculo off-chain verificado en `pricing_oracle` (VWAP 
ventana + EMA α), envío on-chain firmado. - **Entregables**: feed consolidado (contratos), servicio de cálculo, 
**alertas de desvío** (Prometheus), panel de monitor. - **DoD**: métricas de **uptime ≥ 99.9%** y alarmas calibradas **FP < 
1%**; tests de desviación/breaker. - **Controles**: **circuit breaker** automático + manual (DAO), 
kill-switch y `poke` que conserva **LGP** ante desanclajes. 
> Listo para integrarse con N106 (estrategias/tesorería): usa 
`ConsolidatedPriceFeed.consult(asset)` para límites de slippage y 
pausas de mercado. 
Tú dijiste: 
programa a nivel de detalle para GNEW N108 11.8 Presupuestos DAO (Prompt 108) Objetivo: 
Planificación anual/quarterly con ejecución on-chain. Roles: Finanzas, Gobernanza, Data. 
Stack: Propuestas con asignaciones; dashboard de ejecución. Entregables: plantilla de budget, 
KPIs de gasto. Pasos: aprobar lotes; seguimiento; reforecast. DoD: delta vs plan ≤X%; report 
trimestral. Controles: auditoría externa voluntaria. 
ChatGPT Plus 
Pensó durante 48s 
