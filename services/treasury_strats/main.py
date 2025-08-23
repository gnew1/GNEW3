from fastapi import FastAPI, HTTPException 
from pydantic import BaseModel 
from apscheduler.schedulers.background import BackgroundScheduler 
from web3 import Web3 
from web3.middleware import construct_sign_and_send_raw_middleware 
from decimal import Decimal 
import yaml, time, threading 
from prometheus_client import start_http_server, Counter, Gauge 
from .config import settings 
from .policy_engine import compute_price_e18, expected_out, 
min_out_from_policy 
app = FastAPI(title="GNEW Treasury Strategies") 
scheduler = BackgroundScheduler(timezone="UTC") 
w3 = Web3(Web3.HTTPProvider(settings.rpc_url, 
request_kwargs={"timeout": 30})) 
acct = w3.eth.account.from_key(settings.keeper_private_key) 
w3.middleware_onion.add(construct_sign_and_send_raw_middleware(acct)) 
w3.eth.default_account = acct.address 
with open("./services/treasury_strats/abi/StrategyVault.json","r") as 
fp: 
VAULT_ABI = fp.read() 
vault = None 
if settings.vault_address: 
vault = 
w3.eth.contract(address=Web3.to_checksum_address(settings.vault_addres
 s), abi=VAULT_ABI) 
 
# ===== Métricas 
RUNS = Counter("gnew_strats_runs_total","Ejecuciones de 
estrategias",["strategy_id","status"]) 
DEVIATION = Gauge("gnew_strats_deviation_bps","Desviación de out vs 
oracle expect",["strategy_id"]) 
 
# ===== Config / Estado 
class StrategyCfg(BaseModel): 
    id: int 
    label: str 
    enabled: bool = True 
 
class Config(BaseModel): 
    strategies: list[StrategyCfg] = [] 
 
state = {"cfg": Config(strategies=[])} 
cfg_lock = threading.Lock() 
 
def load_cfg(): 
    with open(settings.strategies_yaml, "r", encoding="utf-8") as fp: 
        data = yaml.safe_load(fp) or {} 
    c = Config(**data) 
    with cfg_lock: 
        state["cfg"] = c 
    return c 
 
load_cfg() 
 
def _price_from_feed(feed) -> int: 
    ans = vault.functions.latestRoundData().call()  # Placeholder if 
exposing feeder via vault (not implemented) 
    return int(ans[1]) 
 
def _exec_strategy(sc: StrategyCfg): 
    if not settings.vault_address: return 
    s = vault.functions.getStrategy(sc.id).call() 
    status = s[9] 
    if status != 0:  # Active 
        RUNS.labels(str(sc.id),"skipped").inc() 
        return 
    now = int(time.time()) 
    nextExecAt = s[10] 
    if now < nextExecAt: 
        RUNS.labels(str(sc.id),"waiting").inc(); return 
 
    feedIn = s[14]; feedOut = s[15] 
    # Llamamos directamente a Chainlink feeds 
    FEED_ABI = 
'[{"inputs":[],"name":"latestRoundData","outputs":[{"type":"uint80"},{
 "type":"int256"},{"type":"uint256"},{"type":"uint256"},{"type":"uint80
 "}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"d
 ecimals","outputs":[{"type":"uint8"}],"stateMutability":"view","type":
 "function"}]' 
    fIn = w3.eth.contract(address=feedIn, abi=FEED_ABI) 
    fOut = w3.eth.contract(address=feedOut, abi=FEED_ABI) 
    px_in = int(fIn.functions.latestRoundData().call()[1]) 
    px_out = int(fOut.functions.latestRoundData().call()[1]) 
    price_e18 = 
compute_price_e18(type("S",(object,),{"px_in_e8":px_in,"px_out_e8":px_
 out})()) 
 
    amountIn = int(s[8])  # amountPerExec 
    maxSlip = int(s[4]); minOutBpsOfOracle = int(s[5]) 
    minOut = min_out_from_policy(amountIn, price_e18, 
type("P",(object,),{ 
        "max_slippage_bps": maxSlip, 
        "min_out_bps_of_oracle": minOutBpsOfOracle, 
        "max_move_bps": int(s[16]), 
        "amount_in": Decimal(amountIn)/Decimal(1e18) 
    })()) 
 
    # Ejecuta 
    try: 
        tx = vault.functions.executeDCA(sc.id, 
minOut).build_transaction({ 
            "from": acct.address, 
            "chainId": settings.chain_id, 
            "nonce": w3.eth.get_transaction_count(acct.address), 
            "gas": 700000 
        }) 
        txh = w3.eth.send_transaction(tx) 
        rcpt = w3.eth.wait_for_transaction_receipt(txh, timeout=120) 
        RUNS.labels(str(sc.id),"ok").inc() 
    except Exception as e: 
        RUNS.labels(str(sc.id),"error").inc() 
 
# Programación rolling cada 60s chequea qué estrategias están listas 
scheduler.add_job(lambda: [ _exec_strategy(sc) for sc in 
state["cfg"].strategies if sc.enabled ], 
                  trigger="interval", seconds=60, id="poller", 
max_instances=1) 
 
@app.on_event("startup") 
async def startup(): 
    start_http_server(settings.prometheus_port) 
    scheduler.start() 
 
@app.get("/health") 
async def health(): 
    return {"env": settings.environment, "vault": 
settings.vault_address, "strategies": len(state["cfg"].strategies)} 
 
@app.post("/reload") 
async def reload_cfg(): 
    return load_cfg().model_dump() 
 
@app.post("/execute/{strategy_id}") 
async def force_exec(strategy_id: int): 
    items = [s for s in state["cfg"].strategies if s.id == 
strategy_id] 
    if not items: raise HTTPException(404, "strategy not found in 
cfg") 
    _exec_strategy(items[0]) 
    return {"ok": True} 
 
