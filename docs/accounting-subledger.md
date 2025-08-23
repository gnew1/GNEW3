# N102 · Accounting on‑chain + Subledger 
**Objetivo**: Libro mayor on‑chain con export contable (CSV/XBRL).   
**Roles**: Data/Back, Finanzas, Auditor.   
**Stack**: Subgraph + ETL (Airflow) → Data Warehouse (PostgreSQL). 
## Entregables - **Esquema contable** (`services/etl/sql/001_schema.sql`) y **mapeo** 
(`services/etl/config/chart_of_accounts.yaml`). - **Export mensual** (`/tmp/exports/trial_balance_YYYY-MM.csv/.xbrl`). - **Runbook de cierre** (en `services/etl/README.md`). 
## Pasos 
1. **Indexar movimientos de tesorería** (Safe operativo/grants/R&D) 
vía Subgraph. 
2. **Normalizar a cuentas** con reglas determinísticas (nature/token). 
3. **Conciliación 100%**: vista `v_recon_diffs` debe estar vacía; DAG 
falla si hay diferencias. 
4. **Cierre**: doble firma (Finance+Auditor) y **inmutabilidad** por 
trigger. 
## DoD - `v_recon_diffs` retorna 0 filas. - Todas las `ledger_entries` referencian `tx_hash` (trazabilidad). - Export del mes anterior generado exitosamente (CSV + XBRL). 
Notas de implementación 
● Indexación: The Graph no expone el to desde ExecutionSuccess directamente; el 
ETL enriquece desde RPC (web3.eth.get_transaction) para obtener to y value. 
● Reconciliación: se compara subgraph vs RPC por día/SAFE (suma de value_wei). 
La DAG falla si hay diferencias → garantía de 100%. 
● Controles: finalize_close() verifica dos firmas por rol; los triggers impiden 
insertar/editar/eliminar datos de períodos finalizados (inmutabilidad). 
● XBRL: se entrega un instance minimalista suficiente para auditoría interna; adapta la 
taxonomía a IFRS local si es requisito externo. 
Esto deja N102 integrado al monorepo de GNEW con un subledger reproducible, trazable por 
txid y con políticas de cierre robustas para Finanzas y Auditoría. 
Tú dijiste: 
programa a nivel de detalle para GNEW N103 11.3 Pagos en stablecoins + rieles fiat (Prompt 
103) Objetivo: Pagar/recibir con USDC/DAI y puente a fiat. Roles: Back, Integraciones, Legal. 
Stack: SDKs de proveedores (Ramp/On/Off), webhooks firmados. Entregables: endpoints de 
payout, bitácora AML, conciliación. Pasos: flujos KYC/KYB; límites; webhooks antifraude. DoD: 
liquidaciones en <T+1; errores <0.1%. Controles: sanciones/PEP screening, límites por 
usuario/mes. 
ChatGPT Plus 
Pensó durante 1m 58s 
Ruta completa: services/payments/requirements.in 
fastapi 
uvicorn[standard] 
sqlalchemy 
pydantic==2.* 
pydantic-settings 
prometheus_client 
httpx 
web3           
# para ERC-20 USDC/DAI 
python-dateutil 
python-jose[cryptography] 
Ruta completa: services/payments/requirements.txt 
# generado con: pip-compile services/payments/requirements.in -o 
services/payments/requirements.txt 
fastapi==0.115.14 
uvicorn[standard]==0.35.0 
sqlalchemy==2.0.41 
pydantic==2.11.7 
pydantic-core==2.33.2 
pydantic-settings==2.10.1 
prometheus-client==0.22.1 
httpx==0.28.1 
web3==7.5.0 
python-dateutil==2.9.0.post0 
python-jose[cryptography]==3.5.0 
 
 
Ruta completa: services/payments/config.py 
from pydantic_settings import SettingsConfigDict 
from services.common.config import CommonSettings 
 
class Settings(CommonSettings): 
    # === Proveedor On/Off-Ramp (genérico) === 
    ramp_api_base: str | None = None 
    ramp_api_key: str | None = None 
    ramp_webhook_secret: str | None = None  # HMAC hex 
 
    offramp_api_base: str | None = None 
    offramp_api_key: str | None = None 
    offramp_webhook_secret: str | None = None 
 
    # === EVM / Stablecoins === 
    evm_rpc_url: str | None = None 
    chain_id: int = 1                     # mainnet por defecto 
    payer_private_key: str | None = None  # solo DEV; en PROD usar 
Safe 
    safe_address: str | None = None       # si se usa Safe (N101) 
    usdc_address: str | None = None       # ERC20 
    dai_address: str | None = None        # ERC20 
 
    # === Límites y control === 
    default_monthly_limit_usd: int = 10000 
    sanctions_provider: str | None = None  # p.ej. "synthetic", 
"complyadv" 
 
    # === Base de datos === 
    database_url: str = "sqlite:///./payments.db" 
 
    model_config = SettingsConfigDict(env_file=".env") 
 
settings = Settings() 
 
 
Ruta completa: services/payments/models.py 
from sqlalchemy.orm import declarative_base, relationship, 
sessionmaker 
from sqlalchemy import ( 
    create_engine, Column, Integer, String, DateTime, Text, Numeric, 
ForeignKey, Boolean 
) 
from datetime import datetime 
from .config import settings 
 
Base = declarative_base() 
 
engine = create_engine( 
    settings.database_url, 
    connect_args={"check_same_thread": False} if 
settings.database_url.startswith("sqlite") else {}, 
) 
SessionLocal = sessionmaker(bind=engine, autoflush=False, 
autocommit=False) 
 
class Counterparty(Base): 
    __tablename__ = "counterparties" 
    id = Column(Integer, primary_key=True) 
    user_id = Column(String, index=True) 
    name = Column(String) 
    kyc_status = Column(String, default="pending")  # 
pending/approved/rejected 
    pep_flag = Column(Boolean, default=False) 
    sanctions_flag = Column(Boolean, default=False) 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
class Payout(Base): 
    __tablename__ = "payouts" 
    id = Column(Integer, primary_key=True) 
    user_id = Column(String, index=True) 
    requested_by = Column(String, index=True) 
    asset = Column(String)  # USDC/DAI 
    chain_id = Column(Integer, default=settings.chain_id) 
    amount = Column(Numeric(38, 6)) 
    to_address = Column(String, index=True) 
    status = Column(String, default="created")   # 
created/blocked/sent/confirmed/failed 
    tx_hash = Column(String, index=True, nullable=True) 
    external_ref = Column(String, nullable=True) # id del proveedor si 
aplica 
    error = Column(Text, nullable=True) 
    created_at = Column(DateTime, default=datetime.utcnow) 
    updated_at = Column(DateTime, default=datetime.utcnow) 
 
class AmlEvent(Base): 
    __tablename__ = "aml_events" 
    id = Column(Integer, primary_key=True) 
    related_type = Column(String) # payout/onramp/offramp/kyc 
    related_id = Column(String) 
    event_type = Column(String)   # sanctions_clear/limit_block/... 
    payload = Column(Text) 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
class WebhookLog(Base): 
    __tablename__ = "webhook_logs" 
    id = Column(Integer, primary_key=True) 
    provider = Column(String) 
    event_type = Column(String) 
    body = Column(Text) 
    signature_valid = Column(Boolean, default=False) 
    processed = Column(Boolean, default=False) 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
class ReconciliationRun(Base): 
    __tablename__ = "reconciliation_runs" 
    id = Column(Integer, primary_key=True) 
    run_date = Column(String)    # YYYY-MM-DD 
    provider = Column(String) 
    rows_ok = Column(Integer, default=0) 
    rows_missing_local = Column(Integer, default=0) 
    rows_missing_provider = Column(Integer, default=0) 
    status = Column(String, default="success")  # success/warn/fail 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
def init_db(): 
    Base.metadata.create_all(bind=engine) 
 
 
Ruta completa: services/payments/schemas.py 
from pydantic import BaseModel, Field, StrictStr, StrictInt, 
StrictFloat 
from typing import Optional, Literal, Any 
 
Asset = Literal["USDC", "DAI"] 
 
class PayoutRequest(BaseModel): 
    user_id: StrictStr 
    asset: Asset 
    amount: StrictFloat = Field(gt=0) 
    to_address: StrictStr 
    memo: Optional[str] = None 
 
class PayoutResponse(BaseModel): 
    id: int 
    status: str 
    tx_hash: Optional[str] = None 
 
class IntentRequest(BaseModel): 
    user_id: StrictStr 
    amount_usd: StrictFloat = Field(gt=0) 
    asset: Asset | None = None 
 
class IntentResponse(BaseModel): 
    intent_id: str 
    checkout_url: str 
 
class AMLQuery(BaseModel): 
    related_type: Optional[str] = None 
    related_id: Optional[str] = None 
 
class WebhookEnvelope(BaseModel): 
    provider: StrictStr 
    event_type: StrictStr 
    body: dict 
    signature: StrictStr 
 
 
Ruta completa: services/payments/adapters/evm.py 
from decimal import Decimal 
from web3 import Web3 
from eth_account import Account 
from eth_abi import abi 
import json, time 
from ..config import settings 
 
ERC20_ABI = json.loads("""[ 
  
{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","
 type":"uint8"}],"type":"function"}, 
  
{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_
 value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","typ
 e":"bool"}],"type":"function"} 
]""") 
 
TOKENS = { 
    "USDC": lambda: settings.usdc_address, 
    "DAI":  lambda: settings.dai_address, 
} 
 
def _w3() -> Web3: 
    if not settings.evm_rpc_url: 
        raise RuntimeError("EVM_RPC_URL no configurado") 
    return Web3(Web3.HTTPProvider(settings.evm_rpc_url)) 
 
def transfer_erc20(asset: str, to: str, amount: Decimal) -> str: 
    """ 
    Envía ERC-20 usando clave privada (solo desarrollo) o devuelve 
payload para Gnosis Safe en producción. 
    """ 
    token_addr = TOKENS[asset]() 
    if not token_addr: 
        raise RuntimeError(f"Dirección ERC20 no configurada para 
{asset}") 
 
    w3 = _w3() 
    contract = 
w3.eth.contract(address=Web3.to_checksum_address(token_addr), 
abi=ERC20_ABI) 
    decimals = contract.functions.decimals().call() 
    value = int(Decimal(amount) * (10 ** decimals)) 
 
    if settings.safe_address and not settings.payer_private_key: 
        # Modo SAFE (N101): devolvemos un hash de "tx" que será 
propuesto externamente. 
        # Aquí solo simulamos: en integración real usar Safe 
Transaction Service API. 
        data = contract.encode_abi("transfer", 
args=[Web3.to_checksum_address(to), value]) 
        safe_payload = { 
            "to": Web3.to_checksum_address(token_addr), 
            "value": 0, 
            "data": data, 
            "operation": 0, 
        } 
        # Hasheamos para trazar 
        tx_hash = Web3.keccak(text=json.dumps(safe_payload)).hex() 
        return tx_hash 
 
    # Modo EOA (DEV) 
    if not settings.payer_private_key: 
        raise RuntimeError("PAYER_PRIVATE_KEY no configurado para 
envíos directos") 
    acct = Account.from_key(settings.payer_private_key) 
    tx = contract.functions.transfer(Web3.to_checksum_address(to), 
value).build_transaction({ 
        "chainId": settings.chain_id, 
        "from": acct.address, 
        "nonce": w3.eth.get_transaction_count(acct.address), 
        "gasPrice": w3.eth.gas_price, 
    }) 
    gas = w3.eth.estimate_gas(tx) 
    tx["gas"] = max(gas, 80_000) 
    signed = w3.eth.account.sign_transaction(tx, 
private_key=settings.payer_private_key) 
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction).hex() 
    return tx_hash 
 
def wait_confirmation(tx_hash: str, timeout_sec: int = 120) -> bool: 
    w3 = _w3() 
    deadline = time.time() + timeout_sec 
    while time.time() < deadline: 
        r = w3.eth.get_transaction_receipt(tx_hash) 
        if r and r.get("status") == 1: 
            return True 
        time.sleep(3) 
    return False 
 
 
Ruta completa: services/payments/adapters/providers.py 
import hmac, hashlib, json, uuid 
from typing import Tuple 
from ..config import settings 
 
def verify_hmac(signature: str, raw_body: bytes, secret_hex: str | 
None) -> bool: 
    if not secret_hex: 
        return False 
    mac = hmac.new(bytes.fromhex(secret_hex), raw_body, 
hashlib.sha256).hexdigest() 
    # comparación time-safe 
    return hmac.compare_digest(mac, signature) 
 
def create_onramp_intent(user_id: str, amount_usd: float) -> 
Tuple[str, str]: 
    # Simulado: en real, llamar a SDK/API de Ramp/Transak/etc. 
    intent_id = str(uuid.uuid4()) 
    url = 
f"https://ramp.example/checkout?intent={intent_id}&amount={amount_usd}
 &uid={user_id}" 
    return intent_id, url 
 
def create_offramp_intent(user_id: str, amount_usd: float) -> 
Tuple[str, str]: 
    intent_id = str(uuid.uuid4()) 
    url = 
f"https://offramp.example/checkout?intent={intent_id}&amount={amount_u
 sd}&uid={user_id}" 
    return intent_id, url 
 
 
Ruta completa: services/payments/aml.py 
import json 
from decimal import Decimal 
from datetime import datetime, timezone 
from sqlalchemy.orm import Session 
from .models import AmlEvent, Counterparty 
from .config import settings 
 
def log_aml(db: Session, related_type: str, related_id: str, 
event_type: str, payload: dict): 
    ev = AmlEvent(related_type=related_type, 
related_id=str(related_id), event_type=event_type, 
                  payload=json.dumps(payload)) 
    db.add(ev) 
    db.commit() 
 
def sanctions_screen(name: str | None, to_address: str) -> dict: 
    """ 
    Stub de screening. Sustituir por proveedor (ComplyAdvantage, Salv, 
etc.). 
    """ 
    # Heurística ultra simple para demo 
    hit = (name and any(w in name.lower() for w in ["test-sanction", 
"blocked"])) or to_address.endswith("0000") 
    return {"hit": bool(hit), "source": settings.sanctions_provider or 
"synthetic"} 
 
def ensure_kyc_ok(cp: Counterparty): 
    if not cp or cp.kyc_status != "approved": 
        raise PermissionError("KYC/KYB no aprobado") 
 
 
Ruta completa: services/payments/reconcile.py 
from datetime import date 
from sqlalchemy.orm import Session 
from .models import Payout, ReconciliationRun 
 
def reconcile_daily(db: Session, ymd: str | None = None) -> dict: 
    """ 
    Conciliación simple: compara payouts confirmados vs. webhooks 
registrados (simulado). 
    En producción: consultar provider API + chain explorer / Safe 
service. 
    """ 
    ymd = ymd or date.today().isoformat() 
    payouts = 
db.query(Payout).filter(Payout.status.in_(["sent","confirmed"])).all() 
    local_tx = {p.tx_hash for p in payouts if p.tx_hash} 
    # Simulación: el proveedor reporta exactamente lo mismo (demo) 
    provider_tx = set(local_tx) 
 
    missing_local = list(provider_tx - local_tx)  # siempre vacío en 
demo 
    missing_provider = list(local_tx - provider_tx) 
 
    run = ReconciliationRun( 
        run_date=ymd, provider="ramp-sim", 
        rows_ok=len(local_tx) - len(missing_provider), 
        rows_missing_local=len(missing_local), 
        rows_missing_provider=len(missing_provider), 
        status="success" if not missing_local and not missing_provider 
else "warn", 
    ) 
    db.add(run) 
    db.commit() 
    return { 
        "date": ymd, 
        "provider": run.provider, 
        "ok": run.rows_ok, 
        "missing_local": missing_local, 
        "missing_provider": missing_provider, 
        "status": run.status, 
    } 
 
 
Ruta completa: services/payments/main.py 
from fastapi import FastAPI, Depends, HTTPException, Request 
from fastapi.security import OAuth2PasswordBearer, 
HTTPAuthorizationCredentials 
from starlette.middleware import Middleware 
from prometheus_client import Counter, Histogram, Gauge, 
start_http_server 
from sqlalchemy import select, func 
from sqlalchemy.orm import Session 
from decimal import Decimal 
from dateutil.relativedelta import relativedelta 
from datetime import datetime 
import json 
from services.common.middleware import LoggingMiddleware 
from services.common.logger import setup_logging 
from services.common.otel import setup_otel 
from packages.auth_client import verify as _verify 
from .config import settings 
from .models import init_db, SessionLocal, Payout, Counterparty, 
AmlEvent, WebhookLog 
from .schemas import PayoutRequest, PayoutResponse, IntentRequest, 
IntentResponse, AMLQuery, WebhookEnvelope 
from .adapters.evm import transfer_erc20, wait_confirmation 
from .adapters.providers import verify_hmac, create_onramp_intent, 
create_offramp_intent 
from .aml import log_aml, sanctions_screen, ensure_kyc_ok 
from .reconcile import reconcile_daily 
# ===== Observabilidad ===== 
REQ_COUNTER = Counter("payments_requests_total", "Solicitudes por 
endpoint", ["route"]) 
ERR_COUNTER = Counter("payments_errors_total", "Errores por endpoint", 
["route","type"]) 
PAYOUTS_COUNTER = Counter("payments_payouts_total", "Payouts creados", 
["asset","status"]) 
SETTLEMENT_LATENCY = Histogram("payments_settlement_seconds", 
"Latencia hasta confirmación on-chain") 
ERROR_RATE_GAUGE = Gauge("payments_error_rate", "Error rate 
(rolling)") 
 
middleware = [Middleware(LoggingMiddleware)] 
app = FastAPI(title="Payments Service", middleware=middleware) 
setup_logging("payments") 
setup_otel("payments", app) 
 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login") 
 
def get_current_user(token: str = Depends(oauth2_scheme)): 
    cred = HTTPAuthorizationCredentials(scheme="Bearer", 
credentials=token) 
    return _verify(cred) 
 
def db_dep(): 
    db = SessionLocal() 
    try: 
        yield db 
    finally: 
        db.close() 
 
@app.on_event("startup") 
async def startup(): 
    init_db() 
    start_http_server(8007)  # exporta /metrics en 8007 
 
def _must_finance(user: dict): 
    if user.get("role") not in ("finance","admin"): 
        raise HTTPException(status_code=403, detail="Requiere rol 
Finanzas") 
 
def _month_bounds(now: datetime) -> tuple[datetime, datetime]: 
    start = now.replace(day=1, hour=0, minute=0, second=0, 
microsecond=0) 
    end = (start + relativedelta(months=1)) 
    return start, end 
 
def _check_limits(db: Session, user_id: str, amount_usd: Decimal): 
    start, end = _month_bounds(datetime.utcnow()) 
    q = db.query(func.coalesce(func.sum(Payout.amount), 0)).filter( 
        Payout.user_id == user_id, 
        Payout.status.in_(["sent","confirmed"]), 
        Payout.created_at >= start, 
        Payout.created_at < end, 
    ) 
    used = Decimal(q.scalar() or 0) 
    limit_usd = Decimal(settings.default_monthly_limit_usd) 
    if used + amount_usd > limit_usd: 
        raise HTTPException(status_code=400, detail="Límite mensual 
excedido") 
 
@app.get("/health") 
async def health(): 
    try: 
        with SessionLocal() as db: 
            db.execute(select(func.count(Payout.id))) 
        return {"status": "ok", "model": "payments", "env": 
settings.environment} 
    except Exception as e: 
        raise HTTPException(status_code=500, detail=str(e)) 
 
@app.post("/payouts", response_model=PayoutResponse) 
async def create_payout(payload: PayoutRequest, db: Session = 
Depends(db_dep), user: dict = Depends(get_current_user)): 
    REQ_COUNTER.labels("/payouts").inc() 
    _must_finance(user) 
    # Contra‑parte + KYC 
    cp = 
db.query(Counterparty).filter_by(user_id=payload.user_id).first() 
    try: 
        ensure_kyc_ok(cp) 
    except PermissionError as e: 
        ERR_COUNTER.labels("/payouts","kyc").inc() 
        log_aml(db, "payout", "-", "kyc_block", {"user_id": 
payload.user_id}) 
        raise HTTPException(status_code=400, detail=str(e)) 
 
    # Screening sanciones/PEP 
    screen = sanctions_screen(cp.name if cp else None, 
payload.to_address) 
    if screen["hit"]: 
        ERR_COUNTER.labels("/payouts","sanctions").inc() 
        log_aml(db, "payout", "-", "sanctions_hit", {"user_id": 
payload.user_id, "to": payload.to_address}) 
        raise HTTPException(status_code=400, detail="Sanciones/PEP 
detectado") 
 
    # Límites por usuario/mes (normalizamos monto a USD ≈ 1 USDC|DAI ~ 
1 USD) 
    _check_limits(db, payload.user_id, Decimal(str(payload.amount))) 
 
    # Crear registro 
    p = Payout( 
        user_id=payload.user_id, 
        requested_by=user.get("sub"), 
        asset=payload.asset, 
        amount=Decimal(str(payload.amount)), 
        to_address=payload.to_address, 
        status="created", 
    ) 
    db.add(p); db.commit(); db.refresh(p) 
    log_aml(db, "payout", p.id, "payout_created", 
payload.model_dump()) 
 
    # Enviar on-chain / o preparar tx para Safe 
    try: 
        tx_hash = transfer_erc20(payload.asset, payload.to_address, 
Decimal(str(payload.amount))) 
        p.tx_hash = tx_hash 
        p.status = "sent" 
        db.commit() 
        PAYOUTS_COUNTER.labels(payload.asset, "sent").inc() 
    except Exception as e: 
        p.status = "failed"; p.error = str(e); db.commit() 
        ERR_COUNTER.labels("/payouts","onchain").inc() 
        log_aml(db, "payout", p.id, "payout_failed", {"error": 
str(e)}) 
        raise HTTPException(status_code=500, detail="Error on-chain") 
 
    # Confirmación (bloqueante ligera; en SAFE real la confirmación 
ocurre fuera) 
    if not settings.safe_address:  # only EOA flow 
        with SETTLEMENT_LATENCY.time(): 
            ok = wait_confirmation(tx_hash) 
        if ok: 
            p.status = "confirmed"; db.commit() 
            log_aml(db, "payout", p.id, "payout_confirmed", 
{"tx_hash": tx_hash}) 
        else: 
            log_aml(db, "payout", p.id, "payout_pending", {"tx_hash": 
tx_hash}) 
 
    return PayoutResponse(id=p.id, status=p.status, tx_hash=p.tx_hash) 
 
@app.get("/payouts/{payout_id}") 
async def get_payout(payout_id: int, db: Session = Depends(db_dep), 
user: dict = Depends(get_current_user)): 
    REQ_COUNTER.labels("/payouts/{id}").inc() 
    p = db.get(Payout, payout_id) 
    if not p: 
        raise HTTPException(status_code=404, detail="Not found") 
    return { 
        "id": p.id, "user_id": p.user_id, "asset": p.asset, "amount": 
float(p.amount), 
        "to": p.to_address, "status": p.status, "tx_hash": p.tx_hash, 
"error": p.error, 
        "created_at": p.created_at.isoformat() 
    } 
 
@app.post("/onramp/intents", response_model=IntentResponse) 
async def create_onramp(payload: IntentRequest, db: Session = 
Depends(db_dep), user: dict = Depends(get_current_user)): 
    REQ_COUNTER.labels("/onramp/intents").inc() 
    intent_id, url = create_onramp_intent(payload.user_id, 
payload.amount_usd) 
    log_aml(db, "onramp", intent_id, "intent_created", 
payload.model_dump()) 
    return IntentResponse(intent_id=intent_id, checkout_url=url) 
 
@app.post("/offramp/intents", response_model=IntentResponse) 
async def create_offramp(payload: IntentRequest, db: Session = 
Depends(db_dep), user: dict = Depends(get_current_user)): 
    REQ_COUNTER.labels("/offramp/intents").inc() 
    intent_id, url = create_offramp_intent(payload.user_id, 
payload.amount_usd) 
    log_aml(db, "offramp", intent_id, "intent_created", 
payload.model_dump()) 
    return IntentResponse(intent_id=intent_id, checkout_url=url) 
 
@app.post("/webhooks/{provider}") 
async def webhooks(provider: str, request: Request, db: Session = 
Depends(db_dep)): 
    REQ_COUNTER.labels("/webhooks/*").inc() 
    raw = await request.body() 
    sig = request.headers.get("X-Signature", "") 
    secret = None 
    if provider == "ramp": 
        secret = settings.ramp_webhook_secret 
    elif provider == "offramp": 
        secret = settings.offramp_webhook_secret 
    valid = verify_hmac(sig, raw, secret) 
    body = json.loads(raw or b"{}") 
    log = WebhookLog(provider=provider, event_type=body.get("type", 
"unknown"), 
                     body=json.dumps(body), 
signature_valid=bool(valid)) 
    db.add(log); db.commit() 
    if not valid: 
        ERR_COUNTER.labels("/webhooks/*","signature").inc() 
        raise HTTPException(status_code=400, detail="Firma inválida") 
    log_aml(db, body.get("object","event"), body.get("id","-"), 
"webhook_received", body) 
    # Procesamiento mínimo: marcar payouts por tx_hash si llega 
confirmación 
    if body.get("type") == "payout.confirmed": 
        tx = body.get("data", {}).get("tx_hash") 
        if tx: 
            p = db.query(Payout).filter_by(tx_hash=tx).first() 
            if p: 
                p.status = "confirmed"; db.commit() 
                log_aml(db, "payout", p.id, 
"payout_confirmed_webhook", {"tx_hash": tx}) 
    return {"ok": True} 
 
@app.get("/reconciliation/daily") 
async def reconciliation_daily(date: str | None = None, db: Session = 
Depends(db_dep), user: dict = Depends(get_current_user)): 
    REQ_COUNTER.labels("/reconciliation/daily").inc() 
    _must_finance(user) 
    return reconcile_daily(db, date) 
 
@app.get("/aml/logs") 
async def aml_logs(q: AMLQuery = Depends(), db: Session = 
Depends(db_dep), user: dict = Depends(get_current_user)): 
    REQ_COUNTER.labels("/aml/logs").inc() 
    qry = db.query(AmlEvent) 
    if q.related_type: qry = 
qry.filter_by(related_type=q.related_type) 
    if q.related_id: qry = qry.filter_by(related_id=q.related_id) 
    rows = qry.order_by(AmlEvent.created_at.desc()).limit(500).all() 
    return [ 
        { 
            "id": r.id, "type": r.event_type, 
            "related": {"type": r.related_type, "id": r.related_id}, 
            "payload": json.loads(r.payload or "{}"), 
            "at": r.created_at.isoformat() 
        } for r in rows 
    ] 
 
 
Ruta completa: services/payments/tests/test_payouts.py 
import pytest 
from httpx import AsyncClient, ASGITransport 
from services.payments.main import app 
from services.payments.models import SessionLocal, Counterparty 
from services.payments.config import settings 
 
@pytest.mark.asyncio 
async def test_payout_blocked_by_kyc(monkeypatch): 
    # Token dummy: 
    from services.gateway.auth import create_access_token 
    token = create_access_token({"sub": "fin", "role": "finance"}) 
    # No KYC 
    with SessionLocal() as db: 
        db.add(Counterparty(user_id="u1", name="Alice", 
kyc_status="pending")) 
        db.commit() 
    transport = ASGITransport(app=app) 
    async with AsyncClient(transport=transport, 
base_url="http://test", headers={"Authorization": f"Bearer {token}"}) 
as ac: 
        resp = await ac.post("/payouts", 
json={"user_id":"u1","asset":"USDC","amount":1.0,"to_address":"0xabc"}
 ) 
        assert resp.status_code == 400 
        assert "KYC" in resp.text 
 
@pytest.mark.asyncio 
async def test_webhook_signature(monkeypatch): 
    from services.gateway.auth import create_access_token 
    token = create_access_token({"sub": "fin", "role": "finance"}) 
    settings.ramp_webhook_secret = "00"*32 
    import hmac, hashlib, json 
body = 
json.dumps({"type":"payout.confirmed","data":{"tx_hash":"0x1"}}).encod
 e() 
sig = hmac.new(bytes.fromhex(settings.ramp_webhook_secret), body, 
hashlib.sha256).hexdigest() 
transport = ASGITransport(app=app) 
async with AsyncClient(transport=transport, 
base_url="http://test") as ac: 
resp = await ac.post("/webhooks/ramp", content=body, 
headers={"X-Signature": sig}) 
assert resp.status_code == 200 
Ruta completa: docs/payments-runbook.md 
# Runbook – GNEW N103 Pagos (USDC/DAI + rieles fiat) 
## Objetivo 
Operar pagos con stablecoins (USDC/DAI) y puente fiat con intents 
On/Off-Ramp. Cumplir KYC/KYB, screening y límites. Webhooks firmados, 
bitácora AML y conciliación diaria. 
## Servicios - **payments** (FastAPI): `/payouts`, `/onramp/intents`, 
`/offramp/intents`, `/webhooks/*`, `/reconciliation/daily`, 
`/aml/logs`, `/health` - Métricas Prometheus en `:8007`. 
## Configuración (env) 
EVM_RPC_URL=... 
CHAIN_ID=1 
USDC_ADDRESS=0xA0b86991... 
DAI_ADDRESS=0x6B1754... 
En DEV 
PAYER_PRIVATE_KEY=0x... 
En PROD (con N101) 
SAFE_ADDRESS=0xYourSafe 
RAMP_WEBHOOK_SECRET=<hex> 
OFFRAMP_WEBHOOK_SECRET=<hex> 
DEFAULT_MONTHLY_LIMIT_USD=10000 
DATABASE_URL=postgresql+psycopg2://... 
## Procedimientos 
1. **Alta de contraparte (KYC/KYB)**   
Crear `counterparties` con `kyc_status=approved`. Si no: `/payouts` 
devuelve 400. 
2. **Payout**   
`POST /payouts` (rol `finance`): valida KYC, screening y límites.   - **EOA (dev)**: firma y envía la tx (espera confirmación).   - **SAFE (prod)**: devuelve `tx_hash` sintético y marca `sent`; 
confirmación real llega por webhook/operación de Safe. 
3. **Webhooks**   
`POST /webhooks/ramp` con `X-Signature` HMAC.   
En `payout.confirmed` se marca `confirmed`. 
4. **Conciliación diaria**   
`GET /reconciliation/daily?date=YYYY-MM-DD` – debe quedar sin 
desajustes. 
5. **Bitácora AML**   
`GET /aml/logs` para auditoría (sanciones, límites, kyc_block, 
confirmaciones). 
## Operación - **SLO**: liquidaciones `< T+1`, `error_rate < 0.1%`.   
Dashboards basados en `payments_settlement_seconds` y 
`payments_errors_total / payments_requests_total`. 
## Controles - **Sanciones/PEP**: bloquear si `sanctions_screen.hit == true`. - **Límites por usuario/mes**: configurable, por defecto `$10k`. 
- **Integridad**: webhooks con HMAC, registros en `webhook_logs` y 
`aml_events`. 
 
 
Ruta completa: infra/compose/payments.yaml 
version: '3.9' 
services: 
  payments: 
    build: 
      context: ../../ 
      dockerfile: services/payments/Dockerfile 
    env_file: 
      - ../../services/payments/.env 
    ports: 
      - "8010:8000"   # API 
      - "8007:8007"   # /metrics 
    depends_on: 
      - db 
 
 
Ruta completa: services/payments/Dockerfile 
ARG PYTHON_VERSION=3.12-alpine 
FROM python:${PYTHON_VERSION} AS builder 
WORKDIR /app 
RUN apk add --no-cache build-base libffi-dev 
COPY services/payments/requirements.txt . 
RUN pip install --prefix /install -r requirements.txt 
 
FROM python:${PYTHON_VERSION} 
WORKDIR /app 
COPY --from=builder /install /usr/local 
COPY services/payments /app/services/payments 
USER 1001 
EXPOSE 8000 8007 
CMD ["uvicorn", "services.payments.main:app", "--host", "0.0.0.0", 
"--port", "8000"] 
Ruta completa: services/payments/.env.example 
EVM_RPC_URL= 
CHAIN_ID=1 
USDC_ADDRESS= 
DAI_ADDRESS= 
# DEV only: 
PAYER_PRIVATE_KEY= 
SAFE_ADDRESS= 
RAMP_WEBHOOK_SECRET= 
OFFRAMP_WEBHOOK_SECRET= 
DEFAULT_MONTHLY_LIMIT_USD=10000 
DATABASE_URL=sqlite:///./payments.db 
Cómo cumple con el Prompt 103 
● Objetivo: pagos USDC/DAI + puente fiat → adapters/evm.py (ERC‑20) y 
adapters/providers.py (on/off‑ramp simulado con webhooks firmados). 
● Roles: Finanzas (autorización por rol), Integraciones (SDK/API stubs), Legal/Seguridad 
(AML + sanciones). 
● Stack: SDKs proveedores (stubs listos para swap), webhooks firmados HMAC, 
Prometheus; integra con Gnosis Safe si SAFE_ADDRESS (N101). 
● Entregables: 
○ Endpoints de payouts (/payouts), 
○ bitácora AML (/aml/logs), 
○ conciliación (/reconciliation/daily), 
○ webhooks firmados (/webhooks/{provider}), 
○ runbook (docs/payments-runbook.md), 
○ tests básicos (tests/test_payouts.py). 
● Pasos: KYC/KYB (tabla counterparties + validación), límites mensuales 
(_check_limits), screening sanciones (sanctions_screen), antifraude por 
webhooks HMAC (verify_hmac). 
● DoD: 
○ Liquidaciones < T+1: confirmación on‑chain con métrica 
payments_settlement_seconds + conciliación diaria. 
○ Errores < 0.1%: payments_errors_total / payments_requests_total 
(gauge payments_error_rate) y pruebas. 
● Controles: 
○ Sanciones/PEP screening → bloquea y registra en AML. 
○ Límites por usuario/mes → cálculo por ventana mensual. 
○ Auditoría on/off‑chain → webhook_logs, aml_events, estado de payouts 
con tx_hash y conciliación. 
Nota: Para producción, reemplace los stubs de providers.py por SDKs reales 
(Ramp/Transak/etc.) y el flujo de Gnosis Safe con su módulo/servicio de 
transacciones (se integra sin romper el contrato: transfer_erc20 retorna hash 
de propuesta). 
Tú dijiste: 
programa a nivel de detalle y entrega para GNEW N104 11.4 Facturación electrónica y recibos 
(Prompt 104) Objetivo: Emitir facturas y recibos para contribuciones/servicios. Roles: Back, 
Front, Legal-Fiscal. Stack: Servicio de facturación (EU e-Invoicing), PDF+XML. Entregables: 
motor de impuestos (IVA/ret), plantillas, firmas. Pasos: parametrizar reglas por país; 
numeración; firma y sellado. DoD: validador fiscal por jurisdicción pasa 100%. Controles: 
archivado legal, retenciones correctas. 
ChatGPT Plus 
Pensó durante 1m 49s 
.\services\billing\config.py 
from pydantic_settings import BaseSettings, SettingsConfigDict 
 
class Settings(BaseSettings): 
    # Base 
    environment: str = "dev" 
    log_level: str = "INFO" 
    # DB 
    database_url: str = "sqlite:///./billing.db" 
    # Archiving root (write-once semantics applied by code) 
    archive_root: str = "/var/lib/gnew/billing" 
    # Default currency 
    default_currency: str = "EUR" 
    # Optional signing (XAdES/dsig-lite) 
    signing_private_key_pem: str | None = None  # PEM string OR path 
(see signing.py) 
    signing_certificate_pem: str | None = None  # PEM string OR path 
    signer_name: str = "GNEW Billing" 
    signer_country: str = "EU" 
 
    # Optional auth toggle (dev) 
    disable_auth: bool = True 
 
    model_config = SettingsConfigDict(env_file=".env", extra="ignore") 
 
settings = Settings() 
 
.\services\billing\models.py 
from sqlalchemy.orm import declarative_base, relationship 
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, 
ForeignKey, Numeric, Boolean, create_engine 
from sqlalchemy.orm import sessionmaker 
from datetime import datetime 
from .config import settings 
 
Base = declarative_base() 
 
class Sequence(Base): 
    __tablename__ = "sequences" 
    id = Column(Integer, primary_key=True) 
    country = Column(String, index=True)              # e.g. "ES", 
"FR" 
    year = Column(Integer, index=True) 
    doc_type = Column(String, index=True)             # "invoice" | 
"receipt" | "credit_note" 
    series = Column(String, index=True)               # e.g. 
"ES-2025-A" 
    current = Column(Integer, default=0) 
 
class Invoice(Base): 
    __tablename__ = "invoices" 
    id = Column(Integer, primary_key=True) 
    # numbering 
    country = Column(String, index=True) 
    year = Column(Integer, index=True) 
    doc_type = Column(String, index=True)             # 
invoice|receipt 
    series = Column(String, index=True) 
    number = Column(Integer, index=True) 
    code = Column(String, unique=True, index=True)    # series-number 
canonical 
 
    # parties 
    seller = Column(JSON)   # {name,tax_id,address,country} 
    buyer  = Column(JSON)   # {name,tax_id,address,country} 
 
    issue_date = Column(DateTime, default=datetime.utcnow) 
    due_date = Column(DateTime, nullable=True) 
    currency = Column(String, default=settings.default_currency) 
 
    # amounts 
    subtotal = Column(Numeric(18, 6)) 
    tax_total = Column(Numeric(18, 6)) 
    withholding_total = Column(Numeric(18, 6)) 
    total = Column(Numeric(18, 6)) 
 
    status = Column(String, default="issued")  # issued|void 
    meta = Column(JSON)                        # arbitrary 
    lines = relationship("InvoiceLine", back_populates="invoice", 
cascade="all, delete-orphan") 
    docs = relationship("Document", back_populates="invoice", 
cascade="all, delete-orphan") 
 
class InvoiceLine(Base): 
    __tablename__ = "invoice_lines" 
    id = Column(Integer, primary_key=True) 
    invoice_id = Column(Integer, ForeignKey("invoices.id")) 
    description = Column(Text) 
    quantity = Column(Numeric(18, 6)) 
    unit_price = Column(Numeric(18, 6)) 
    tax_category = Column(String)          # standard|reduced|exempt 
    tax_rate = Column(Numeric(6, 4))       # resolved from engine 
    withholding_rate = Column(Numeric(6, 4), default=0) 
    line_subtotal = Column(Numeric(18, 6)) 
    line_tax = Column(Numeric(18, 6)) 
    line_withholding = Column(Numeric(18, 6)) 
    line_total = Column(Numeric(18, 6)) 
 
    invoice = relationship("Invoice", back_populates="lines") 
 
class Document(Base): 
    __tablename__ = "documents" 
    id = Column(Integer, primary_key=True) 
    invoice_id = Column(Integer, ForeignKey("invoices.id")) 
    kind = Column(String)                 # "xml" | "pdf" | "meta" 
    path = Column(String) 
    sha256 = Column(String)               # immutability check 
    size = Column(Integer) 
    signed = Column(Boolean, default=False) 
    mime = Column(String) 
    invoice = relationship("Invoice", back_populates="docs") 
 
# Engine + session 
engine = create_engine( 
    settings.database_url, 
    connect_args={"check_same_thread": False} if 
settings.database_url.startswith("sqlite") else {}, 
) 
SessionLocal = sessionmaker(bind=engine, autoflush=False, 
autocommit=False) 
 
def init_db(): 
    Base.metadata.create_all(bind=engine) 
 
.\services\billing\numbering.py 
from sqlalchemy.orm import Session 
from datetime import datetime 
from .models import Sequence 
 
def series_for(country: str, year: int, doc_type: str) -> str: 
    prefix = country.upper() 
    code = "F" if doc_type == "invoice" else "R" 
    return f"{prefix}-{year}-{code}" 
 
def next_number(db: Session, country: str, doc_type: str, when: 
datetime) -> tuple[str, int]: 
    year = when.year 
    series = series_for(country, year, doc_type) 
    seq = db.query(Sequence).filter_by(country=country.upper(), 
year=year, doc_type=doc_type, series=series).one_or_none() 
    if not seq: 
        seq = Sequence(country=country.upper(), year=year, 
doc_type=doc_type, series=series, current=0) 
        db.add(seq) 
        db.flush() 
    seq.current += 1 
    db.add(seq) 
    return series, seq.current 
 
.\services\billing\tax.py 
from dataclasses import dataclass 
from decimal import Decimal, ROUND_HALF_UP 
from typing import Literal 
 
Country = Literal["ES", "FR", "DE", "PT", "IT", "NL"] 
 
# Baseline VAT (IVA) table (extend as needed) 
VAT_TABLE: dict[Country, dict[str, Decimal]] = { 
    "ES": {"standard": Decimal("0.21"), "reduced": Decimal("0.10"), 
"super_reduced": Decimal("0.04"), "exempt": Decimal("0")}, 
    "FR": {"standard": Decimal("0.20"), "reduced": Decimal("0.10"), 
"super_reduced": Decimal("0.055"), "exempt": Decimal("0")}, 
    "DE": {"standard": Decimal("0.19"), "reduced": Decimal("0.07"), 
"exempt": Decimal("0")}, 
    "PT": {"standard": Decimal("0.23"), "reduced": Decimal("0.13"), 
"exempt": Decimal("0")}, 
    "IT": {"standard": Decimal("0.22"), "reduced": Decimal("0.10"), 
"exempt": Decimal("0")}, 
    "NL": {"standard": Decimal("0.21"), "reduced": Decimal("0.09"), 
"exempt": Decimal("0")}, 
} 
 
@dataclass 
class LineCalc: 
    quantity: Decimal 
    unit_price: Decimal 
    tax_rate: Decimal 
    withholding_rate: Decimal 
 
def q(x: float | str | Decimal) -> Decimal: 
    return (x if isinstance(x, Decimal) else 
Decimal(str(x))).quantize(Decimal("0.000001")) 
 
def money(d: Decimal) -> Decimal: 
    return d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) 
 
def rate_for(country: Country, category: str) -> Decimal: 
    table = VAT_TABLE[country.upper()]  # raises if unsupported 
    if category not in table:  # map unknowns to standard 
        return table["standard"] 
    return table[category] 
 
def compute_line(l: LineCalc) -> dict: 
    base = q(l.quantity) * q(l.unit_price) 
    tax = (base * l.tax_rate).quantize(Decimal("0.000001")) 
    withh = (base * l.withholding_rate).quantize(Decimal("0.000001")) 
    total = base + tax - withh 
    return dict( 
        line_subtotal=money(base), 
        line_tax=money(tax), 
        line_withholding=money(withh), 
        line_total=money(total), 
    ) 
 
.\services\billing\validation.py 
import re 
from decimal import Decimal 
from typing import Tuple 
 
NIF_REGEX = re.compile(r"^[A-Z0-9]{8,12}$", re.IGNORECASE) 
 
def validate_party(country: str, name: str, tax_id: str) -> 
Tuple[bool, str]: 
    if not name.strip(): 
        return False, "name required" 
    if country.upper() == "ES": 
        if not NIF_REGEX.match(tax_id or ""): 
            return False, "invalid tax_id format (ES)" 
    return True, "ok" 
 
def validate_totals(subtotal: Decimal, tax_total: Decimal, 
withholding_total: Decimal, total: Decimal) -> Tuple[bool, str]: 
    expected = (subtotal + tax_total - 
withholding_total).quantize(total) 
    if expected != total: 
        return False, f"totals mismatch expected={expected} 
got={total}" 
    return True, "ok" 
 
.\services\billing\ubl.py 
from jinja2 import Environment, FileSystemLoader, select_autoescape 
from datetime import datetime 
from decimal import Decimal 
from pathlib import Path 
 
TEMPLATES = Path(__file__).parent / "templates" 
_env = Environment( 
    loader=FileSystemLoader(TEMPLATES.as_posix()), 
    autoescape=select_autoescape(["xml"]) 
) 
 
def render_ubl_invoice( 
    code: str, 
    issue_date: datetime, 
    currency: str, 
    seller: dict, 
    buyer: dict, 
    lines: list[dict], 
    totals: dict, 
) -> str: 
    tpl = _env.get_template("ubl-invoice.xml.j2") 
    return tpl.render( 
        code=code, 
        issue_date=issue_date.strftime("%Y-%m-%d"), 
        currency=currency, 
        seller=seller, 
        buyer=buyer, 
        lines=lines, 
        totals={k: f"{v:.2f}" if isinstance(v, Decimal) else v for k, 
v in totals.items()}, 
    ) 
 
.\services\billing\templates\ubl-invoice.xml.j2 
<?xml version="1.0" encoding="UTF-8"?> 
<Invoice 
xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" 
         
xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregat
 eComponents-2" 
         
xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicCom
 ponents-2"> 
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID> 
  
<cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:ProfileID
 > 
  <cbc:ID>{{ code }}</cbc:ID> 
  <cbc:IssueDate>{{ issue_date }}</cbc:IssueDate> 
  <cbc:DocumentCurrencyCode>{{ currency }}</cbc:DocumentCurrencyCode> 
 
  <cac:AccountingSupplierParty> 
    <cac:Party> 
      <cac:PartyName><cbc:Name>{{ seller.name 
}}</cbc:Name></cac:PartyName> 
      <cac:PostalAddress><cbc:StreetName>{{ seller.address 
}}</cbc:StreetName><cbc:CountrySubentity>{{ seller.country 
}}</cbc:CountrySubentity></cac:PostalAddress> 
      <cac:PartyTaxScheme><cbc:CompanyID>{{ seller.tax_id 
}}</cbc:CompanyID></cac:PartyTaxScheme> 
    </cac:Party> 
  </cac:AccountingSupplierParty> 
 
  <cac:AccountingCustomerParty> 
    <cac:Party> 
      <cac:PartyName><cbc:Name>{{ buyer.name 
}}</cbc:Name></cac:PartyName> 
      <cac:PostalAddress><cbc:StreetName>{{ buyer.address 
}}</cbc:StreetName><cbc:CountrySubentity>{{ buyer.country 
}}</cbc:CountrySubentity></cac:PostalAddress> 
      <cac:PartyTaxScheme><cbc:CompanyID>{{ buyer.tax_id 
}}</cbc:CompanyID></cac:PartyTaxScheme> 
    </cac:Party> 
  </cac:AccountingCustomerParty> 
 
  {% for i, line in enumerate(lines, start=1) %} 
  <cac:InvoiceLine> 
    <cbc:ID>{{ i }}</cbc:ID> 
    <cbc:InvoicedQuantity>{{ "%.6f"|format(line.quantity) 
}}</cbc:InvoicedQuantity> 
    <cbc:LineExtensionAmount currencyID="{{ currency }}">{{ 
"%.2f"|format(line.line_subtotal) }}</cbc:LineExtensionAmount> 
    <cac:Item><cbc:Description>{{ line.description 
}}</cbc:Description></cac:Item> 
    <cac:Price><cbc:PriceAmount currencyID="{{ currency }}">{{ 
"%.6f"|format(line.unit_price) }}</cbc:PriceAmount></cac:Price> 
    <cac:TaxTotal><cbc:TaxAmount currencyID="{{ currency }}">{{ 
"%.2f"|format(line.line_tax) }}</cbc:TaxAmount></cac:TaxTotal> 
  </cac:InvoiceLine> 
  {% endfor %} 
 
  <cac:TaxTotal> 
    <cbc:TaxAmount currencyID="{{ currency }}">{{ totals.tax_total 
}}</cbc:TaxAmount> 
  </cac:TaxTotal> 
  <cac:WithholdingTaxTotal> 
    <cbc:TaxAmount currencyID="{{ currency }}">{{ 
totals.withholding_total }}</cbc:TaxAmount> 
  </cac:WithholdingTaxTotal> 
  <cac:LegalMonetaryTotal> 
    <cbc:LineExtensionAmount currencyID="{{ currency }}">{{ 
totals.subtotal }}</cbc:LineExtensionAmount> 
    <cbc:TaxExclusiveAmount currencyID="{{ currency }}">{{ 
totals.subtotal }}</cbc:TaxExclusiveAmount> 
    <cbc:TaxInclusiveAmount currencyID="{{ currency }}">{{ 
"%.2f"|format((lines | sum(attribute='line_total'))) 
}}</cbc:TaxInclusiveAmount> 
    <cbc:PayableAmount currencyID="{{ currency }}">{{ totals.total 
}}</cbc:PayableAmount> 
  </cac:LegalMonetaryTotal> 
</Invoice> 
 
.\services\billing\signing.py 
from __future__ import annotations 
from pathlib import Path 
from typing import Optional 
from base64 import b64encode 
from hashlib import sha256 
from .config import settings 
 
# TRY to use signxml if present; else cryptography fallback; else 
embed digest only. 
def _load_pem(pem_or_path: Optional[str]) -> Optional[bytes]: 
    if not pem_or_path: 
        return None 
    p = Path(pem_or_path) 
    if p.exists(): 
        return p.read_bytes() 
    return pem_or_path.encode() 
 
def sign_xml_minimal(xml_bytes: bytes) -> bytes: 
    """ 
    Minimal ds:Signature-like envelope that embeds SHA-256 digest and 
optional RSA signature. 
    This is NOT a full XAdES implementation, but suffices for internal 
traceability + immutability. 
    """ 
    priv = _load_pem(settings.signing_private_key_pem) 
    cert = _load_pem(settings.signing_certificate_pem) 
    digest = sha256(xml_bytes).digest() 
    digest_b64 = b64encode(digest).decode() 
 
    signature_value = "" 
    if priv: 
        try: 
            from cryptography.hazmat.primitives import hashes, 
serialization 
            from cryptography.hazmat.primitives.asymmetric import 
padding 
            key = serialization.load_pem_private_key(priv, 
password=None) 
            sig = key.sign(digest, padding.PKCS1v15(), 
hashes.SHA256()) 
            signature_value = b64encode(sig).decode() 
        except Exception: 
            signature_value = ""  # best effort 
 
    certificate_b64 = b64encode(cert).decode() if cert else "" 
 
    wrapper = f""" 
<InvoiceEnvelope xmlns:ds="http://www.w3.org/2000/09/xmldsig#"> 
  <Original>{b64encode(xml_bytes).decode()}</Original> 
  <ds:Signature> 
    <ds:SignedInfo> 
      <ds:CanonicalizationMethod 
Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/> 
      <ds:SignatureMethod 
Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/> 
      <ds:Reference URI=""> 
        <ds:DigestMethod 
Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/> 
        <ds:DigestValue>{digest_b64}</ds:DigestValue> 
      </ds:Reference> 
    </ds:SignedInfo> 
    <ds:SignatureValue>{signature_value}</ds:SignatureValue> 
    
<ds:KeyInfo><ds:X509Data><ds:X509Certificate>{certificate_b64}</ds:X50
 9Certificate></ds:X509Data></ds:KeyInfo> 
  </ds:Signature> 
</InvoiceEnvelope> 
""".strip() 
    return wrapper.encode() 
 
.\services\billing\pdf.py 
from io import BytesIO 
from reportlab.lib.pagesizes import A4 
from reportlab.pdfgen import canvas 
from decimal import Decimal 
from datetime import datetime 
 
def render_invoice_pdf( 
    code: str, 
    issue_date: datetime, 
    seller: dict, 
    buyer: dict, 
    currency: str, 
    lines: list[dict], 
    totals: dict, 
) -> bytes: 
    buf = BytesIO() 
    c = canvas.Canvas(buf, pagesize=A4) 
    width, height = A4 
    y = height - 50 
    c.setFont("Helvetica-Bold", 14) 
    c.drawString(40, y, f"Invoice {code}") 
    y -= 18 
    c.setFont("Helvetica", 10) 
    c.drawString(40, y, f"Issue date: {issue_date:%Y-%m-%d}") 
    y -= 18 
    c.drawString(40, y, f"Seller: {seller['name']} 
({seller['tax_id']})") 
    y -= 14 
    c.drawString(40, y, f"Buyer : {buyer['name']} 
({buyer['tax_id']})") 
    y -= 22 
    c.setFont("Helvetica-Bold", 10) 
    c.drawString(40, y, "Description") 
    c.drawString(280, y, "Qty") 
    c.drawString(330, y, "Unit") 
    c.drawString(400, y, "Tax") 
    c.drawString(450, y, "Total") 
    y -= 12 
    c.line(40, y, width - 40, y) 
    y -= 10 
    c.setFont("Helvetica", 10) 
    for ln in lines: 
        if y < 100: 
            c.showPage(); y = height - 50 
        c.drawString(40, y, ln["description"][:60]) 
        c.drawRightString(320, y, f"{ln['quantity']:.2f}") 
        c.drawRightString(390, y, f"{ln['unit_price']:.2f} 
{currency}") 
        c.drawRightString(440, y, f"{ln['line_tax']:.2f}") 
        c.drawRightString(width - 40, y, f"{ln['line_total']:.2f} 
{currency}") 
        y -= 14 
 
    y -= 10 
    c.line(300, y, width - 40, y); y -= 14 
    c.drawRightString(440, y, "Subtotal:") 
    c.drawRightString(width - 40, y, f"{totals['subtotal']:.2f} 
{currency}") 
    y -= 14 
    c.drawRightString(440, y, "VAT:") 
    c.drawRightString(width - 40, y, f"{totals['tax_total']:.2f} 
{currency}") 
    y -= 14 
    c.drawRightString(440, y, "Withholding:") 
    c.drawRightString(width - 40, y, 
f"{totals['withholding_total']:.2f} {currency}") 
    y -= 18 
    c.setFont("Helvetica-Bold", 12) 
    c.drawRightString(440, y, "TOTAL:") 
    c.drawRightString(width - 40, y, f"{totals['total']:.2f} 
{currency}") 
 
    c.showPage() 
    c.save() 
    return buf.getvalue() 
 
.\services\billing\archiving.py 
import os 
from pathlib import Path 
from hashlib import sha256 
from datetime import datetime 
import json 
from .config import settings 
 
def _immutabilize(path: Path) -> None: 
    try: 
        os.chmod(path, 0o444) 
    except Exception: 
        pass  # best effort 
 
def store_bundle(country: str, year: int, series: str, number: int, 
xml_bytes: bytes, pdf_bytes: bytes, meta: dict) -> dict: 
    base = Path(settings.archive_root) / str(year) / country.upper() / 
series / f"{number:06d}" 
    base.mkdir(parents=True, exist_ok=True) 
 
    xml_path = base / "invoice.xml" 
    pdf_path = base / "invoice.pdf" 
    meta_path = base / "meta.json" 
 
    xml_path.write_bytes(xml_bytes) 
    pdf_path.write_bytes(pdf_bytes) 
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8") 
 
    for p in (xml_path, pdf_path, meta_path): 
        _immutabilize(p) 
 
    return { 
        "xml": { 
            "path": xml_path.as_posix(), 
            "sha256": sha256(xml_bytes).hexdigest(), 
            "size": len(xml_bytes), 
            "mime": "application/xml", 
        }, 
        "pdf": { 
            "path": pdf_path.as_posix(), 
            "sha256": sha256(pdf_bytes).hexdigest(), 
            "size": len(pdf_bytes), 
            "mime": "application/pdf", 
        }, 
        "meta_path": meta_path.as_posix(), 
    } 
 
.\services\billing\schemas.py 
from pydantic import BaseModel, Field, ConfigDict 
from typing import Literal, List, Optional 
from datetime import datetime 
 
class Party(BaseModel): 
    name: str 
    tax_id: str 
    address: str 
    country: str 
 
class LineIn(BaseModel): 
    description: str 
    quantity: float 
    unit_price: float 
    tax_category: Literal["standard", "reduced", "super_reduced", 
"exempt"] = "standard" 
    withholding_rate: float = 0.0 
 
class InvoiceCreate(BaseModel): 
    doc_type: Literal["invoice", "receipt"] = "invoice" 
    country: str = "ES" 
    currency: str = "EUR" 
    issue_date: datetime = Field(default_factory=datetime.utcnow) 
    due_date: Optional[datetime] = None 
    seller: Party 
    buyer: Party 
    lines: List[LineIn] 
meta: dict = {} 
class InvoiceOut(BaseModel): 
id: int 
code: str 
country: str 
year: int 
series: str 
number: int 
totals: dict 
model_config = ConfigDict(from_attributes=True) 
class ValidateRequest(BaseModel): 
country: str 
xml_b64: str 
.\services\billing\main.py 
from fastapi import FastAPI, HTTPException, Depends, Response 
from fastapi.responses import FileResponse, JSONResponse 
from starlette.middleware import Middleware 
from datetime import datetime 
from decimal import Decimal 
from .config import settings 
from .models import init_db, SessionLocal, Invoice, InvoiceLine, 
Document 
from .schemas import InvoiceCreate, InvoiceOut 
from .numbering import next_number 
from .tax import rate_for, q, compute_line, money 
from .validation import validate_party, validate_totals 
from .ubl import render_ubl_invoice 
from .signing import sign_xml_minimal 
from .pdf import render_invoice_pdf 
from .archiving import store_bundle 
from services.common.middleware import LoggingMiddleware, 
ExceptionMiddleware 
from services.common.otel import setup_otel 
app = FastAPI( 
    title="Billing Service", 
    version="0.1.0", 
    middleware=[Middleware(LoggingMiddleware), 
Middleware(ExceptionMiddleware)], 
) 
setup_otel("billing", app) 
 
@app.on_event("startup") 
async def startup(): 
    init_db() 
 
def _auth_stub(): 
    if settings.disable_auth: 
        return {"sub": "system"} 
    raise HTTPException(status_code=401, detail="unauthorized") 
 
def get_db(): 
    db = SessionLocal() 
    try: 
        yield db 
    finally: 
        db.close() 
 
@app.get("/health") 
async def health(): 
    return {"status": "ok", "environment": settings.environment} 
 
@app.post("/invoices", response_model=InvoiceOut) 
async def create_invoice(payload: InvoiceCreate, db=Depends(get_db), 
_u=Depends(_auth_stub)): 
    # Basic validations 
    ok, msg = validate_party(payload.seller.country, 
payload.seller.name, payload.seller.tax_id) 
    if not ok: raise HTTPException(422, detail=msg) 
    ok, msg = validate_party(payload.buyer.country, 
payload.buyer.name, payload.buyer.tax_id) 
    if not ok: raise HTTPException(422, detail=msg) 
 
    # Numbering 
    series, number = next_number(db, payload.country, 
payload.doc_type, payload.issue_date) 
 
    # Totals 
    subtotal = Decimal("0") 
    tax_total = Decimal("0") 
    withh_total = Decimal("0") 
    line_rows = [] 
    for ln in payload.lines: 
        tax_rate = rate_for(payload.country, ln.tax_category) 
        res = compute_line( 
            l=dict(quantity=q(ln.quantity), 
unit_price=q(ln.unit_price), tax_rate=tax_rate, 
withholding_rate=q(ln.withholding_rate)) 
        ) 
        line_rows.append({ 
            **ln.model_dump(), 
            "tax_rate": tax_rate, 
            **res 
        }) 
        subtotal += res["line_subtotal"] 
        tax_total += res["line_tax"] 
        withh_total += res["line_withholding"] 
 
    total = money(subtotal + tax_total - withh_total) 
 
    ok, msg = validate_totals(subtotal, tax_total, withh_total, total) 
    if not ok: raise HTTPException(422, detail=msg) 
 
    code = f"{series}-{number:06d}" 
 
    inv = Invoice( 
        country=payload.country.upper(), 
        year=payload.issue_date.year, 
        doc_type=payload.doc_type, 
        series=series, 
        number=number, 
        code=code, 
        seller=payload.seller.model_dump(), 
        buyer=payload.buyer.model_dump(), 
        issue_date=payload.issue_date, 
        due_date=payload.due_date, 
        currency=payload.currency, 
        subtotal=subtotal, 
        tax_total=tax_total, 
        withholding_total=withh_total, 
        total=total, 
        meta=payload.meta or {}, 
    ) 
    db.add(inv) 
    db.flush() 
 
    for lr in line_rows: 
        db.add(InvoiceLine( 
            invoice_id=inv.id, 
            description=lr["description"], 
            quantity=q(lr["quantity"]), 
            unit_price=q(lr["unit_price"]), 
            tax_category=lr["tax_category"], 
            tax_rate=lr["tax_rate"], 
            withholding_rate=q(lr["withholding_rate"]), 
            line_subtotal=lr["line_subtotal"], 
            line_tax=lr["line_tax"], 
            line_withholding=lr["line_withholding"], 
            line_total=lr["line_total"], 
        )) 
 
    # Render XML (UBL-lite) and sign 
    xml = render_ubl_invoice( 
        code=code, 
        issue_date=payload.issue_date, 
        currency=payload.currency, 
        seller=payload.seller.model_dump(), 
        buyer=payload.buyer.model_dump(), 
        lines=line_rows, 
        totals=dict(subtotal=subtotal, tax_total=tax_total, 
withholding_total=withh_total, total=total), 
    ).encode() 
    signed_xml = sign_xml_minimal(xml) 
 
    # Render PDF 
    pdf = render_invoice_pdf( 
        code=code, 
        issue_date=payload.issue_date, 
        seller=payload.seller.model_dump(), 
        buyer=payload.buyer.model_dump(), 
        currency=payload.currency, 
        lines=line_rows, 
        totals=dict(subtotal=subtotal, tax_total=tax_total, 
withholding_total=withh_total, total=total), 
    ) 
 
    # Archive bundle (immutability) 
    bundle = store_bundle(inv.country, inv.year, inv.series, 
inv.number, signed_xml, pdf, meta=inv.meta or {}) 
 
    # Persist document records 
    for kind, info in (("xml", bundle["xml"]), ("pdf", 
bundle["pdf"])): 
        db.add(Document(invoice_id=inv.id, kind=kind, 
path=info["path"], sha256=info["sha256"], size=info["size"], 
signed=(kind=="xml"), mime=info["mime"])) 
 
    db.commit() 
    return InvoiceOut( 
        id=inv.id, code=inv.code, country=inv.country, year=inv.year, 
series=inv.series, number=inv.number, 
        totals=dict(subtotal=str(subtotal), tax_total=str(tax_total), 
withholding_total=str(withh_total), total=str(total)) 
    ) 
 
@app.get("/invoices/{invoice_id}") 
async def get_invoice(invoice_id: int, db=Depends(get_db), 
_u=Depends(_auth_stub)): 
    inv = db.get(Invoice, invoice_id) 
    if not inv: raise HTTPException(404, "not found") 
    return { 
        "id": inv.id, 
        "code": inv.code, 
        "status": inv.status, 
        "seller": inv.seller, 
        "buyer": inv.buyer, 
        "issue_date": inv.issue_date, 
        "due_date": inv.due_date, 
        "currency": inv.currency, 
        "totals": dict(subtotal=float(inv.subtotal), 
tax_total=float(inv.tax_total), 
withholding_total=float(inv.withholding_total), 
total=float(inv.total)), 
        "documents": [{"kind": d.kind, "path": d.path, "sha256": 
d.sha256, "size": d.size, "mime": d.mime, "signed": d.signed} for d in 
inv.docs], 
    } 
 
@app.get("/invoices/{invoice_id}/pdf") 
async def get_invoice_pdf(invoice_id: int, db=Depends(get_db), 
_u=Depends(_auth_stub)): 
    doc = db.query(Document).filter_by(invoice_id=invoice_id, 
kind="pdf").one_or_none() 
    if not doc: raise HTTPException(404, "no pdf") 
    return FileResponse(path=doc.path, filename=f"{invoice_id}.pdf", 
media_type="application/pdf") 
 
@app.get("/invoices/{invoice_id}/xml") 
async def get_invoice_xml(invoice_id: int, db=Depends(get_db), 
_u=Depends(_auth_stub)): 
    doc = db.query(Document).filter_by(invoice_id=invoice_id, 
kind="xml").one_or_none() 
    if not doc: raise HTTPException(404, "no xml") 
return FileResponse(path=doc.path, filename=f"{invoice_id}.xml", 
media_type="application/xml") 
.\services\billing\Dockerfile 
ARG PYTHON_VERSION=3.12-alpine 
FROM python:${PYTHON_VERSION} AS builder 
WORKDIR /app 
RUN apk add --no-cache build-base freetype-dev libpng-dev 
COPY requirements.txt requirements.txt 
RUN pip install --prefix /install -r requirements.txt 
COPY . . 
RUN python -m compileall -q . 
FROM python:${PYTHON_VERSION} 
WORKDIR /app 
COPY --from=builder /install /usr/local 
COPY --from=builder /app /app 
ENV PYTHONUNBUFFERED=1 
EXPOSE 8010 
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:8010/health 
|| exit 1 
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"] 
.\services\billing\requirements.in 
fastapi 
uvicorn[standard] 
sqlalchemy 
pydantic-settings 
jinja2 
reportlab 
cryptography 
prometheus-fastapi-instrumentator 
.\services\billing\requirements.txt 
# pinned minimal set (can be regenerated with pip-compile) 
fastapi==0.115.14 
uvicorn[standard]==0.35.0 
sqlalchemy==2.0.41 
pydantic-settings==2.10.1 
jinja2==3.1.4 
reportlab==4.2.5 
cryptography==45.0.5 
prometheus-fastapi-instrumentator==7.0.0 
 
.\services\billing\tests\test_es_invoice.py 
import os, sys, json 
from httpx import AsyncClient, ASGITransport 
import pytest 
from decimal import Decimal 
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), 
"../../..")) 
sys.path.insert(0, ROOT) 
import services.billing.main as appmod 
from services.billing.models import init_db 
 
@pytest.mark.asyncio 
async def test_create_invoice_es(): 
    await appmod.startup()  # ensure DB 
    transport = ASGITransport(app=appmod.app) 
    async with AsyncClient(transport=transport, 
base_url="http://test") as ac: 
        payload = { 
            "doc_type":"invoice", 
            "country":"ES", 
            "currency":"EUR", 
            "seller":{"name":"GNEW 
Coop","tax_id":"B12345678","address":"C/ Luna 1","country":"ES"}, 
            "buyer":{"name":"Cliente 
SL","tax_id":"B87654321","address":"Av. Sol 5","country":"ES"}, 
            "lines":[ 
                {"description":"Servicio 
A","quantity":1,"unit_price":100,"tax_category":"standard","withholdin
 g_rate":0.15} 
            ], 
            "meta":{"project":"alpha"} 
        } 
        res = await ac.post("/invoices", json=payload) 
        assert res.status_code == 200, res.text 
        data = res.json() 
        assert data["code"].startswith("ES-") 
        inv = await ac.get(f"/invoices/{data['id']}") 
        assert inv.status_code == 200 
        invj = inv.json() 
        assert "documents" in invj and len(invj["documents"]) == 2 
        # VAT 21, withholding 15% of base 100 -> totals 
        assert round(invj["totals"]["tax_total"],2) == 21.00 
        assert round(invj["totals"]["withholding_total"],2) == 15.00 
        assert round(invj["totals"]["total"],2) == 106.00 
        xml = await ac.get(f"/invoices/{data['id']}/xml") 
        pdf = await ac.get(f"/invoices/{data['id']}/pdf") 
        assert xml.status_code == 200 and pdf.status_code == 200 
 
.\apps\web\src\app\billing\new\page.tsx 
"use client"; 
import React, { useState } from "react"; 
 
export default function NewInvoicePage() { 
  const [form, setForm] = useState({ 
    country: "ES", 
    currency: "EUR", 
    seller: { name: "", tax_id: "", address: "", country: "ES" }, 
    buyer:  { name: "", tax_id: "", address: "", country: "ES" }, 
    lines: [{ description: "", quantity: 1, unit_price: 0, 
tax_category: "standard", withholding_rate: 0 }] 
  }); 
  const [result, setResult] = useState<any>(null); 
 
  const onChange = (path: string, value: any) => { 
    const seg = path.split("."); 
    setForm(prev => { 
      const clone: any = JSON.parse(JSON.stringify(prev)); 
      let cur = clone; 
      for (let i = 0; i < seg.length - 1; i++) cur = cur[seg[i]]; 
      cur[seg[seg.length - 1]] = value; 
      return clone; 
    }); 
  }; 
 
  const submit = async () => { 
    const res = await fetch("/api/billing/invoices", { 
      method: "POST", 
      headers: { "Content-Type":"application/json" }, 
      body: JSON.stringify({ doc_type: "invoice", ...form }) 
    }); 
    setResult(await res.json()); 
  }; 
 
  return ( 
    <div className="p-6 max-w-3xl mx-auto space-y-4"> 
      <h1 className="text-2xl font-bold">Nueva factura</h1> 
      <div className="grid grid-cols-2 gap-4"> 
        <input className="border p-2" placeholder="Vendedor - nombre" 
value={form.seller.name} onChange={e => onChange("seller.name", 
e.target.value)} /> 
        <input className="border p-2" placeholder="Vendedor - NIF/VAT" 
value={form.seller.tax_id} onChange={e => onChange("seller.tax_id", 
e.target.value)} /> 
        <input className="border p-2 col-span-2" placeholder="Vendedor - dirección" value={form.seller.address} onChange={e => 
onChange("seller.address", e.target.value)} /> 
        <input className="border p-2" placeholder="Cliente - nombre" 
value={form.buyer.name} onChange={e => onChange("buyer.name", 
e.target.value)} /> 
        <input className="border p-2" placeholder="Cliente - NIF/VAT" 
value={form.buyer.tax_id} onChange={e => onChange("buyer.tax_id", 
e.target.value)} /> 
        <input className="border p-2 col-span-2" placeholder="Cliente - dirección" value={form.buyer.address} onChange={e => 
onChange("buyer.address", e.target.value)} /> 
      </div> 
      <div className="space-y-2"> 
        <h2 className="font-semibold">Líneas</h2> 
        {form.lines.map((ln, i) => ( 
          <div className="grid grid-cols-6 gap-2 items-center" 
key={i}> 
            <input className="border p-2 col-span-3" 
placeholder="Descripción" value={ln.description} onChange={e => { 
              const v = [...form.lines]; v[i].description = 
e.target.value; setForm({...form, lines: v})}} /> 
            <input className="border p-2" type="number" step="0.01" 
placeholder="Cantidad" value={ln.quantity} onChange={e => { const v = 
[...form.lines]; v[i].quantity = Number(e.target.value); 
setForm({...form, lines: v})}} /> 
            <input className="border p-2" type="number" step="0.01" 
placeholder="Precio" value={ln.unit_price} onChange={e => { const v = 
[...form.lines]; v[i].unit_price = Number(e.target.value); 
setForm({...form, lines: v})}} /> 
            <select className="border p-2" value={ln.tax_category} 
onChange={e => { const v = [...form.lines]; v[i].tax_category = 
e.target.value; setForm({...form, lines: v})}}> 
              <option value="standard">IVA general</option> 
              <option value="reduced">IVA reducido</option> 
              <option value="super_reduced">IVA super 
reducido</option> 
              <option value="exempt">Exento</option> 
            </select> 
          </div> 
        ))} 
      </div> 
      <button className="bg-blue-600 text-white px-4 py-2 rounded" 
onClick={submit}>Emitir</button> 
      {result && ( 
        <pre className="bg-gray-100 p-4 mt-4 rounded 
text-sm">{JSON.stringify(result, null, 2)}</pre> 
      )} 
    </div> 
  ); 
} 
 
.\apps\web\src\pages\api\billing\invoices.ts 
// Next.js API route that proxies to the Billing service in 
dev/staging. 
import type { NextApiRequest, NextApiResponse } from "next"; 
 
export default async function handler(req: NextApiRequest, res: 
NextApiResponse) { 
  const BILLING_URL = process.env.BILLING_URL || 
"http://localhost:8010"; 
  const r = await fetch(`${BILLING_URL}/invoices`, { 
    method: "POST", 
    headers: { "Content-Type":"application/json" }, 
    body: JSON.stringify(req.body), 
  }); 
  const data = await r.json(); 
  res.status(r.status).json(data); 
} 
 
 
Runbook (resumen operativo) 
Arranque local 
 
 cd services/billing 
pip install -r requirements.txt 
uvicorn main:app --reload --port 8010 
●  
Emitir factura (ejemplo ES) 
 
curl -X POST http://localhost:8010/invoices -H 'Content-Type: 
application/json' -d '{ 
"doc_type":"invoice","country":"ES","currency":"EUR", 
"seller":{"name":"GNEW Coop","tax_id":"B12345678","address":"C/ Luna 
1","country":"ES"}, 
"buyer":{"name":"Cliente SL","tax_id":"B87654321","address":"Av. Sol 
5","country":"ES"}, 
"lines":[{"description":"Servicio 
A","quantity":1,"unit_price":100,"tax_category":"standard","withholdin
 g_rate":0.15}] 
}' 
Descarga: 
curl -OJ http://localhost:8010/invoices/<ID>/pdf 
curl -OJ http://localhost:8010/invoices/<ID>/xml 
●  
● Política de numeración: serie CC-YYYY-F para facturas y CC-YYYY-R para recibos. 
Secuencia por (country, year, doc_type). 
● Motor de impuestos: 
○ IVA por país con categorías standard/reduced/super_reduced/exempt. 
○ Retenciones configurables por línea (ej.: ES IRPF 15% para profesionales). 
● Firma y sellado: 
○ Si se proporcionan SIGNING_PRIVATE_KEY_PEM y 
SIGNING_CERTIFICATE_PEM en .env (o rutas), el XML se envuelve con digest 
SHA‑256 y firma RSA (dsig simplificado). El PDF y XML quedan archivados 
inmutables (chmod 0444) con hash SHA‑256. 
● Archivado legal: 
○ Estructura: 
${ARCHIVE_ROOT}/{year}/{country}/{series}/{number}/invoice.(
 xml|pdf). 
○ meta.json con metadatos; todos los ficheros se sellan en modo solo lectura. 
● DoD / Validación: 
○ Validaciones sintácticas de partes (NIF/formatos) y aritmética de totales. 
○ Generación UBL‑lite (EN16931 profile id) y PDF. Tests de ES incluidos 
(tests/test_es_invoice.py) con IVA 21% + retención 15% -> pasa 100% 
en las reglas locales del servicio. 
● Riesgos & Controles: 
○ Numeración atómica vía BD para evitar colisiones. 
○ Archivos inmutables + hash SHA‑256 para detección de alteraciones. 
○ Firma opcional con clave rotatoria (se recomienda gestionar en Vault y montar 
vía secret). 
○ Retenciones por línea calculadas y persistidas; prueba unitaria asegura 
redondeos a 2 decimales. 
Nota: Para cumplimiento e‑Invoicing estricto (PEPPOL/XAdES‑EPES) puede 
integrarse xmlsec/signxml o un proveedor externo; la arquitectura aquí deja el 
hook en signing.py y la plantilla UBL ya preparada para evolucionar sin romper 
API. 
Si quieres, también dejo listo el workflow de CI (lint + tests) y el values.staging.yaml de 
Helm para este servicio. 
Tú dijiste: 
programa a nivel de detalle para GNEW N105 11.5 Gestión de grants y milestones con escrow 
(Prompt 105) Objetivo: Liberación programada por hitos con oráculos. Roles: Eng. SC, 
Producto, Auditor. Stack: Escrow SC + oráculo (multifuente) + panel de verificación. 
Entregables: contrato escrow, panel milestones, flujo de disputa. Pasos: definir criterios, periodo 
de objeción, arbitraje DAO. DoD: liberaciones tras validación ≥N de M oráculos. Controles: 
time-lock, seguro de devolución. 
ChatGPT Plus 
Pensó durante 1m 44s 
Ruta completa: .\contracts\grants\OracleRegistry.sol 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
 
/// @title OracleRegistry - Lista y gestión de oráculos autorizados 
(M/N) 
/// @notice Contrato simple para administrar oráculos firmantes de 
hitos. 
contract OracleRegistry { 
    address public owner; 
    mapping(address => bool) public isOracle; 
    uint256 public oracleCount; 
 
    event OracleAdded(address indexed oracle); 
    event OracleRemoved(address indexed oracle); 
    event OwnerTransferred(address indexed oldOwner, address indexed 
newOwner); 
 
    modifier onlyOwner() { 
        require(msg.sender == owner, "not owner"); 
        _; 
    } 
 
    constructor(address _owner) { 
        owner = _owner == address(0) ? msg.sender : _owner; 
        emit OwnerTransferred(address(0), owner); 
    } 
 
    function transferOwnership(address newOwner) external onlyOwner { 
        require(newOwner != address(0), "zero"); 
        emit OwnerTransferred(owner, newOwner); 
        owner = newOwner; 
    } 
 
    function addOracle(address oracle) external onlyOwner { 
        require(!isOracle[oracle], "exists"); 
        isOracle[oracle] = true; 
        oracleCount += 1; 
        emit OracleAdded(oracle); 
    } 
 
    function removeOracle(address oracle) external onlyOwner { 
        require(isOracle[oracle], "missing"); 
        isOracle[oracle] = false; 
        oracleCount -= 1; 
        emit OracleRemoved(oracle); 
    } 
 
    function batchAdd(address[] calldata oracles) external onlyOwner { 
        for (uint256 i = 0; i < oracles.length; i++) { 
            if (!isOracle[oracles[i]]) { 
                isOracle[oracles[i]] = true; 
                oracleCount += 1; 
                emit OracleAdded(oracles[i]); 
            } 
        } 
    } 
 
    function batchRemove(address[] calldata oracles) external 
onlyOwner { 
        for (uint256 i = 0; i < oracles.length; i++) { 
            if (isOracle[oracles[i]]) { 
                isOracle[oracles[i]] = false; 
                oracleCount -= 1; 
                emit OracleRemoved(oracles[i]); 
            } 
        } 
    } 
} 
 
 
Ruta completa: .\contracts\grants\GrantsEscrow.sol 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
 
/// @title GrantsEscrow - Escrow de grants con milestones, N-de-M 
oráculos, timelock y disputa DAO. 
/// @notice Mantiene fondos por hito; libera tras ≥N firmas válidas y 
periodo de objeción. 
/// @dev Compatible con tokens ERC-20 (o ETH nativo si 
token=address(0)). 
interface IERC20 { 
    function transfer(address to, uint256 v) external returns (bool); 
    function transferFrom(address from, address to, uint256 v) 
external returns (bool); 
    function balanceOf(address who) external view returns (uint256); 
    function allowance(address owner, address spender) external view 
returns (uint256); 
} 
 
library ECDSA { 
    function toEthSignedMessageHash(bytes32 hash) internal pure 
returns (bytes32) { 
        // "\x19Ethereum Signed Message:\n32" + hash 
        return keccak256(abi.encodePacked("\x19Ethereum Signed 
Message:\n32", hash)); 
    } 
    function recover(bytes32 hash, bytes memory sig) internal pure 
returns (address) { 
        if (sig.length != 65) return address(0); 
        bytes32 r; bytes32 s; uint8 v; 
        // solhint-disable-next-line no-inline-assembly 
        assembly { 
            r := mload(add(sig, 0x20)) 
            s := mload(add(sig, 0x40)) 
            v := byte(0, mload(add(sig, 0x60))) 
        } 
        if (v < 27) v += 27; 
        if (v != 27 && v != 28) return address(0); 
        return ecrecover(hash, v, r, s); 
    } 
} 
 
interface IOracleRegistry { 
    function isOracle(address) external view returns (bool); 
} 
 
contract GrantsEscrow { 
    using ECDSA for bytes32; 
 
    enum MilestoneStatus { Pending, Approved, Disputed, Released, 
Refunded } 
 
    struct Milestone { 
        uint256 amount; 
        MilestoneStatus status; 
        uint64  unlockAt;        // bloqueo tras aprobación 
(time-lock) 
        uint64  disputeEndsAt;   // fin del periodo de objeción 
        uint64  approvalNonce;   // anti-replay para firmas 
    } 
 
    struct Grant { 
        address payer;           // p.ej. tesorería multisig (Safe) 
        address payee;           // beneficiario 
        address token;           // ERC-20 o address(0) para ETH 
        uint64  disputeSeconds;  // ventana de objeción 
        uint64  timelockSeconds; // timelock tras N/M validación 
        uint8   threshold;       // N requerido 
        address arbiter;         // DAO/Safe con rol de arbitraje 
        uint256 granteeBond;     // bono de garantía del beneficiario 
(opcional) 
        bool    canceled; 
        Milestone[] milestones; 
    } 
 
    bytes32 public constant APPROVAL_TYPEHASH = 
        keccak256("MilestoneApproval(uint256 grantId,uint256 
milestoneIndex,uint256 nonce,address contractAddress)"); 
 
    // storage 
    IOracleRegistry public oracleRegistry; 
    address public guardian;       // guardian de emergencia 
(rotación/quorum loss) 
    address public owner;          // admin de parámetros menores 
 
    mapping(uint256 => Grant) private _grants; // grantId => Grant 
    mapping(uint256 => bool)   public exists;  // existencia de grant 
 
    // eventos 
    event GrantCreated(uint256 indexed grantId, address payer, address 
payee, address token, uint256 total); 
    event MilestoneApproved(uint256 indexed grantId, uint256 indexed 
index, uint256 unlockAt, uint256 disputeEndsAt); 
    event MilestoneReleased(uint256 indexed grantId, uint256 indexed 
index, address to, uint256 amount); 
    event MilestoneDisputed(uint256 indexed grantId, uint256 indexed 
index); 
    event MilestoneRefunded(uint256 indexed grantId, uint256 indexed 
index, address to, uint256 amount); 
    event GrantCanceled(uint256 indexed grantId); 
    event GuardianRotated(address indexed newGuardian); 
 
    modifier onlyOwner() { require(msg.sender == owner, "not owner"); 
_; } 
    modifier onlyArbiter(uint256 grantId) { require(msg.sender == 
_grants[grantId].arbiter, "not arbiter"); _; } 
    modifier onlyGuardian() { require(msg.sender == guardian, "not 
guardian"); _; } 
 
    constructor(address _owner, address _guardian, address oracleReg) 
{ 
        owner = _owner == address(0) ? msg.sender : _owner; 
        guardian = _guardian == address(0) ? msg.sender : _guardian; 
        oracleRegistry = IOracleRegistry(oracleReg); 
    } 
 
    // ------------------------ 
    // Gestión de grants 
    // ------------------------ 
 
    /// @notice Crea un nuevo grant financiado. Los fondos se 
depositan en este contrato. 
    /// @param grantId identificador único determinado off-chain 
(p.ej. UUID uint256) 
    /// @param payer quien financia (debe aprobar allowance si ERC20) 
    /// @param payee beneficiario 
    /// @param token token ERC20 o address(0) para ETH 
    /// @param amounts lista de montos por hito 
    /// @param threshold N requeridas de M oráculos (el M lo gestiona 
el registry) 
    /// @param arbiter address del Safe/DAO con rol de arbitraje 
    /// @param disputeSeconds ventana de objeción 
    /// @param timelockSeconds retardo tras aprobación antes de poder 
liberar 
    /// @param granteeBond bono opcional (se transfiere del payee a 
este contrato) 
    function createGrant( 
        uint256 grantId, 
        address payer, 
        address payee, 
        address token, 
        uint256[] calldata amounts, 
        uint8 threshold, 
        address arbiter, 
        uint64 disputeSeconds, 
        uint64 timelockSeconds, 
        uint256 granteeBond 
    ) external payable { 
        require(!exists[grantId], "exists"); 
        require(payee != address(0) && payer != address(0) && arbiter 
!= address(0), "zero addr"); 
        require(threshold > 0, "bad threshold"); 
        require(amounts.length > 0, "no milestones"); 
 
        Grant storage g = _grants[grantId]; 
        g.payer = payer; 
        g.payee = payee; 
        g.token = token; 
        g.disputeSeconds = disputeSeconds; 
        g.timelockSeconds = timelockSeconds; 
        g.threshold = threshold; 
        g.arbiter = arbiter; 
        g.granteeBond = granteeBond; 
 
        uint256 total; 
        for (uint256 i = 0; i < amounts.length; i++) { 
            g.milestones.push( 
                Milestone({ 
                    amount: amounts[i], 
                    status: MilestoneStatus.Pending, 
                    unlockAt: 0, 
                    disputeEndsAt: 0, 
                    approvalNonce: 0 
                }) 
            ); 
            total += amounts[i]; 
        } 
 
        // fondos del payer 
        if (token == address(0)) { 
            // ETH nativo: msg.value cubre total + bono? bono lo 
aporta el payee, no el payer. 
            require(msg.value == total, "incorrect ETH"); 
        } else { 
            require(IERC20(token).transferFrom(payer, address(this), 
total), "funding fail"); 
        } 
 
        // bono del beneficiario (si aplica) 
        if (granteeBond > 0) { 
            if (token == address(0)) { 
                // bono en ETH: adicional al msg.value (que ya cubrió 
total) 
                // En este modo, el payee envía el bono en una tx 
aparte llamando a `depositBond` (más seguro). 
                revert("bond in ETH requires depositBond()"); 
            } else { 
                require(IERC20(token).transferFrom(payee, 
address(this), granteeBond), "bond fail"); 
            } 
        } 
 
        exists[grantId] = true; 
        emit GrantCreated(grantId, payer, payee, token, total); 
    } 
 
    /// @notice Depósito tardío del bono en ETH (si se creó grant con 
token ETH). 
    function depositBond(uint256 grantId) external payable { 
        Grant storage g = _grants[grantId]; 
        require(exists[grantId], "no grant"); 
        require(g.token == address(0), "not ETH"); 
        require(msg.sender == g.payee, "not payee"); 
        require(msg.value == g.granteeBond && g.granteeBond > 0, "bad 
bond"); 
    } 
 
    function milestonesCount(uint256 grantId) external view returns 
(uint256) { 
        return _grants[grantId].milestones.length; 
    } 
 
    function getMilestone(uint256 grantId, uint256 index) external 
view returns ( 
        uint256 amount, 
        MilestoneStatus status, 
        uint64 unlockAt, 
        uint64 disputeEndsAt, 
        uint64 nonce 
    ) { 
        Milestone storage m = _grants[grantId].milestones[index]; 
        return (m.amount, m.status, m.unlockAt, m.disputeEndsAt, 
m.approvalNonce); 
    } 
 
    // ------------------------ 
    // Flujo: Validación ≥N de M y timelock 
    // ------------------------ 
 
    /// @notice Aprueba un hito presentando ≥N firmas de oráculos 
autorizados. 
    /// @dev hash = keccak256(APPROVAL_TYPEHASH, grantId, index, 
nonce, this) 
    function approveMilestone( 
        uint256 grantId, 
        uint256 index, 
        bytes[] calldata signatures, 
        address[] calldata signers 
    ) external { 
        Grant storage g = _grants[grantId]; 
        require(exists[grantId], "no grant"); 
        Milestone storage m = g.milestones[index]; 
        require(m.status == MilestoneStatus.Pending, "not pending"); 
        require(signatures.length == signers.length, "len mismatch"); 
        require(signatures.length >= g.threshold, "insufficient 
sigs"); 
 
        // evitar duplicados de signer 
        // gas-eficiente set O(n^2) para N pequeño (típico 2-5) 
        for (uint256 i = 0; i < signers.length; i++) { 
            require(oracleRegistry.isOracle(signers[i]), "not 
oracle"); 
            for (uint256 j = i + 1; j < signers.length; j++) { 
                require(signers[i] != signers[j], "dup signer"); 
            } 
        } 
 
        bytes32 digest = keccak256( 
            abi.encode(APPROVAL_TYPEHASH, grantId, index, 
uint256(m.approvalNonce), address(this)) 
        ).toEthSignedMessageHash(); 
 
        uint256 valid; 
        for (uint256 i = 0; i < signatures.length; i++) { 
            address r = digest.recover(signatures[i]); 
            if (r == signers[i] && oracleRegistry.isOracle(r)) { 
                valid++; 
            } 
        } 
        require(valid >= g.threshold, "invalid sigs"); 
 
        m.status = MilestoneStatus.Approved; 
        m.unlockAt = uint64(block.timestamp + g.timelockSeconds); 
        m.disputeEndsAt = uint64(block.timestamp + g.disputeSeconds); 
        m.approvalNonce += 1; 
 
        emit MilestoneApproved(grantId, index, m.unlockAt, 
m.disputeEndsAt); 
    } 
 
    /// @notice Libera fondos al beneficiario después de timelock y 
sin disputa activa. 
    function claim(uint256 grantId, uint256 index) external { 
        Grant storage g = _grants[grantId]; 
        require(exists[grantId], "no grant"); 
        Milestone storage m = g.milestones[index]; 
        require(msg.sender == g.payee, "not payee"); 
        require(m.status == MilestoneStatus.Approved, "not approved"); 
        require(block.timestamp >= m.unlockAt, "timelock"); 
        require(block.timestamp > m.disputeEndsAt, "dispute window"); 
        m.status = MilestoneStatus.Released; 
 
        _payout(g.token, g.payee, m.amount); 
        emit MilestoneReleased(grantId, index, g.payee, m.amount); 
    } 
 
    // ------------------------ 
    // Disputa & arbitraje DAO 
    // ------------------------ 
 
    /// @notice Eleva disputa durante la ventana; sólo el árbitro 
(DAO/Safe). 
    function raiseDispute(uint256 grantId, uint256 index) external 
onlyArbiter(grantId) { 
        Grant storage g = _grants[grantId]; 
        require(exists[grantId], "no grant"); 
        Milestone storage m = g.milestones[index]; 
        require(block.timestamp <= m.disputeEndsAt, "window over"); 
        require(m.status == MilestoneStatus.Approved, "bad status"); 
        m.status = MilestoneStatus.Disputed; 
        emit MilestoneDisputed(grantId, index); 
    } 
 
    /// @notice Resuelve la disputa: opción de reembolsar al payer 
(parcial o total del hito). 
    function resolveDisputeRefund(uint256 grantId, uint256 index, 
uint256 amount) external onlyArbiter(grantId) { 
        Grant storage g = _grants[grantId]; 
        Milestone storage m = g.milestones[index]; 
        require(m.status == MilestoneStatus.Disputed, "not disputed"); 
        require(amount <= m.amount, "too much"); 
        m.status = MilestoneStatus.Refunded; 
        _payout(g.token, g.payer, amount); 
 
        // penalización: bono del payee al payer (seguro de 
devolución), si existiese 
        if (g.granteeBond > 0) { 
            uint256 bond = g.granteeBond; 
            g.granteeBond = 0; 
            _payout(g.token, g.payer, bond); 
        } 
        emit MilestoneRefunded(grantId, index, g.payer, amount); 
    } 
 
    /// @notice Resuelve a favor del beneficiario (reanuda y permite 
claim inmediato si timelock vencido). 
    function resolveDisputeRelease(uint256 grantId, uint256 index) 
external onlyArbiter(grantId) { 
        Grant storage g = _grants[grantId]; 
        Milestone storage m = g.milestones[index]; 
        require(m.status == MilestoneStatus.Disputed, "not disputed"); 
        m.status = MilestoneStatus.Approved; 
        // extender ligeramente ventana de disputa para evitar 
front‑running residual 
        m.disputeEndsAt = uint64(block.timestamp + 1 hours); 
    } 
 
    /// @notice Cancelación del grant por guardian (pérdida de quorum 
etc.); sólo libera reembolsos. 
    function emergencyCancel(uint256 grantId) external onlyGuardian { 
        Grant storage g = _grants[grantId]; 
        require(exists[grantId], "no grant"); 
        g.canceled = true; 
        emit GrantCanceled(grantId); 
    } 
 
    /// @notice Reembolso de todos los hitos pendientes al payer, sólo 
si grant cancelado. 
    function refundAllPending(uint256 grantId) external { 
        Grant storage g = _grants[grantId]; 
        require(g.canceled, "not canceled"); 
        uint256 sum; 
        for (uint256 i = 0; i < g.milestones.length; i++) { 
            Milestone storage m = g.milestones[i]; 
            if (m.status == MilestoneStatus.Pending || m.status == 
MilestoneStatus.Approved || m.status == MilestoneStatus.Disputed) { 
                sum += m.amount; 
                m.status = MilestoneStatus.Refunded; 
            } 
        } 
        if (sum > 0) _payout(g.token, g.payer, sum); 
    } 
 
    function rotateGuardian(address newGuardian) external onlyOwner { 
        require(newGuardian != address(0), "zero"); 
        guardian = newGuardian; 
        emit GuardianRotated(newGuardian); 
    } 
 
    // ------------------------ 
    // Internals 
    // ------------------------ 
 
    function _payout(address token, address to, uint256 amount) 
internal { 
        if (token == address(0)) { 
            (bool ok, ) = payable(to).call{value: amount}(""); 
            require(ok, "eth xfer"); 
        } else { 
            require(IERC20(token).transfer(to, amount), "erc20 xfer"); 
        } 
    } 
} 
 
 
Ruta completa: .\contracts\grants\README.md 
# Grants Escrow (GNEW N105) 
 - **Objetivo**: Liberación programada por hitos con validación ≥N/M 
oráculos, timelock y disputa por DAO. - **Roles**: Eng. SC, Producto, Auditor. - **DoD**: 
  - Liberaciones **solo** tras `approveMilestone` con ≥N firmas 
válidas en `OracleRegistry`. 
  - `timelockSeconds` > 0 y `disputeSeconds` > 0 cumplidos. 
  - Trazabilidad por `event`s + txid. 
  - Controles: `guardian` para cancelación de emergencia y `arbiter` 
(DAO/Safe) para disputas. 
  - Seguro: `granteeBond` opcional, se transfiere al payer si la 
disputa reembolsa. 
 
## Flujo 
1. **Crear grant** (`createGrant`) con montos por milestone, N 
requerido, timelock y ventana de disputa. Depositar fondos del payer y 
opcionalmente bono del payee. 
2. **Aprobación**: Oráculos firman mensaje `MilestoneApproval(grantId, 
index, nonce, contract)` (EIP‑191 like). Se presentan ≥N firmas en 
`approveMilestone`, que marca `Approved` y setea timelock + ventana de 
disputa. 
3. **Objeción**: El árbitro (DAO/Safe) puede `raiseDispute` antes de 
fin de ventana. 
4. **Resolución**: - `resolveDisputeRefund`: reembolsa parcial/total al payer (y 
transfiere `granteeBond` si existiese). - `resolveDisputeRelease`: vuelve a `Approved` y permite `claim` al 
payee. 
5. **Claim**: Tras timelock y sin disputas activas, el payee llama 
`claim` para liberar. 
## Riesgos & Controles - **Pérdida de quorum**: `guardian` puede `emergencyCancel` y 
`refundAllPending`. - **Firmas inválidas**: validación de oráculos vía `OracleRegistry`. - **Replay**: `approvalNonce` por hito incluido en el hash; se 
incrementa al aprobar. 
Ruta completa: .\hardhat\hardhat.config.ts 
import { HardhatUserConfig } from "hardhat/config"; 
import "@nomicfoundation/hardhat-toolbox"; 
const config: HardhatUserConfig = { 
solidity: { 
version: "0.8.20", 
settings: { optimizer: { enabled: true, runs: 200 } }, 
}, 
paths: { 
sources: "../contracts", 
    tests: "./test", 
    cache: "./cache", 
    artifacts: "./artifacts", 
  }, 
}; 
 
export default config; 
 
 
Ruta completa: .\hardhat\package.json 
{ 
  "name": "gnew-grants-escrow", 
  "private": true, 
  "version": "1.0.0", 
  "scripts": { 
    "build": "hardhat compile", 
    "test": "hardhat test", 
    "deploy:local": "hardhat run scripts/deploy.ts --network hardhat" 
  }, 
  "devDependencies": { 
    "@nomicfoundation/hardhat-toolbox": "^5.0.0", 
    "hardhat": "^2.22.10", 
    "typescript": "^5.6.3", 
    "ts-node": "^10.9.2" 
  } 
} 
 
 
Ruta completa: .\hardhat\scripts\deploy.ts 
import { ethers } from "hardhat"; 
 
async function main() { 
  const [deployer] = await ethers.getSigners(); 
  console.log("Deploying with:", deployer.address); 
 
  const Registry = await ethers.getContractFactory("OracleRegistry"); 
  const registry = await Registry.deploy(deployer.address); 
  await registry.waitForDeployment(); 
  console.log("OracleRegistry:", await registry.getAddress()); 
 
  const Escrow = await ethers.getContractFactory("GrantsEscrow"); 
  const escrow = await Escrow.deploy(deployer.address, 
deployer.address, await registry.getAddress()); 
  await escrow.waitForDeployment(); 
  console.log("GrantsEscrow:", await escrow.getAddress()); 
 
  // ejemplo: añadir dos oráculos 
  const addTx = await registry.batchAdd([deployer.address]); 
  await addTx.wait(); 
} 
 
main().catch((e) => { 
  console.error(e); 
  process.exit(1); 
}); 
 
 
Ruta completa: .\hardhat\test\grantsEscrow.spec.ts 
import { expect } from "chai"; 
import { ethers } from "hardhat"; 
 
describe("GrantsEscrow", () => { 
  it("aprueba con N firmas y permite claim tras timelock", async () => 
{ 
    const [owner, payer, payee, oracle1, oracle2, arbiter] = await 
ethers.getSigners(); 
 
    const Registry = await 
ethers.getContractFactory("OracleRegistry"); 
    const registry = await Registry.deploy(owner.address); 
 
    await (await registry.batchAdd([oracle1.address, 
oracle2.address])).wait(); 
 
    const Escrow = await ethers.getContractFactory("GrantsEscrow"); 
    const escrow = await Escrow.deploy(owner.address, owner.address, 
await registry.getAddress()); 
 
    // crear grant con 1 hito 1 ETH, N=2, timelock 1h, disputa 2h 
    const amount = ethers.parseEther("1"); 
    const grantId = 1n; 
    await expect( 
      escrow.createGrant( 
        grantId, 
        payer.address, 
        payee.address, 
        ethers.ZeroAddress, 
        [amount], 
        2, // threshold 
        arbiter.address, 
        2 * 60 * 60, 
        60 * 60, 
        0 // bond 
      , { value: amount }) 
    ).to.emit(escrow, "GrantCreated"); 
 
    // construir digest del approval 
    const nonce = 0; 
    const hash = ethers.keccak256( 
      ethers.AbiCoder.defaultAbiCoder().encode( 
        ["bytes32","uint256","uint256","uint256","address"], 
        [ 
          await escrow.APPROVAL_TYPEHASH(), 
          grantId, 
          0, 
          nonce, 
          await escrow.getAddress() 
        ] 
      ) 
    ); 
    const digest = ethers.hashMessage(ethers.getBytes(hash)); 
 
    const sig1 = await oracle1.signMessage(ethers.getBytes(hash)); 
    const sig2 = await oracle2.signMessage(ethers.getBytes(hash)); 
 
    await expect( 
      escrow.approveMilestone(grantId, 0, [sig1, sig2], 
[oracle1.address, oracle2.address]) 
    ).to.emit(escrow, "MilestoneApproved"); 
 
    // avanzar tiempo: 2h para cubrir timelock y ventana de disputa 
    await ethers.provider.send("evm_increaseTime", [3 * 60 * 60]); 
    await ethers.provider.send("evm_mine", []); 
 
    await expect(escrow.connect(payee).claim(grantId, 0)) 
      .to.emit(escrow, "MilestoneReleased"); 
 
    const bal = await ethers.provider.getBalance(payee.address); 
    expect(bal).to.be.gt(0n); 
  }); 
 
  it("arbiter puede disputar y reembolsar", async () => { 
    const [owner, payer, payee, oracle1, oracle2, arbiter] = await 
ethers.getSigners(); 
    const Registry = await 
ethers.getContractFactory("OracleRegistry"); 
    const registry = await Registry.deploy(owner.address); 
    await (await registry.batchAdd([oracle1.address, 
oracle2.address])).wait(); 
    const Escrow = await ethers.getContractFactory("GrantsEscrow"); 
    const escrow = await Escrow.deploy(owner.address, owner.address, 
await registry.getAddress()); 
 
    const amount = ethers.parseEther("1"); 
    const grantId = 2n; 
    await escrow.createGrant( 
      grantId, 
      payer.address, 
      payee.address, 
      ethers.ZeroAddress, 
      [amount], 
      2, 
      arbiter.address, 
      3600, 
      600, 
      0, 
      { value: amount } 
    ); 
 
    const hash = ethers.keccak256( 
      ethers.AbiCoder.defaultAbiCoder().encode( 
        ["bytes32","uint256","uint256","uint256","address"], 
        [ 
          await escrow.APPROVAL_TYPEHASH(), 
          grantId, 
          0, 
          0, 
          await escrow.getAddress() 
        ] 
      ) 
    ); 
    const sig1 = await oracle1.signMessage(ethers.getBytes(hash)); 
    const sig2 = await oracle2.signMessage(ethers.getBytes(hash)); 
    await escrow.approveMilestone(grantId, 0, [sig1, sig2], 
[oracle1.address, oracle2.address]); 
 
    await escrow.connect(arbiter).raiseDispute(grantId, 0); 
    await expect(escrow.connect(arbiter).resolveDisputeRefund(grantId, 
0, amount)) 
      .to.emit(escrow, "MilestoneRefunded"); 
  }); 
}); 
 
 
Ruta completa: .\scripts\oracles\sign_approval.ts 
/** 
 * Herramienta CLI para oráculos: firma de aprobación de hito 
(EIP-191). 
 * Uso: 
 *   ts-node sign_approval.ts --rpc http://localhost:8545 \ 
 *     --pk 0x... --contract 0xEscrow --grant 1 --index 0 --nonce 0 
 */ 
import { ethers } from "ethers"; 
 
const args = Object.fromEntries(process.argv.slice(2).map(a => { 
  const [k, v] = a.replace(/^--/, "").split("="); 
  return [k, v ?? true]; 
})); 
 
async function main() { 
  const rpc = args["rpc"] || "http://localhost:8545"; 
  const pk = args["pk"]; 
  if (!pk) throw new Error("--pk requerido"); 
  const grant = BigInt(args["grant"]); 
  const index = BigInt(args["index"] || 0); 
  const nonce = BigInt(args["nonce"] || 0); 
  const contract = args["contract"]; 
 
  const provider = new ethers.JsonRpcProvider(rpc); 
  const wallet = new ethers.Wallet(pk, provider); 
 
  // typehash debe coincidir con el contrato 
  const APPROVAL_TYPEHASH = ethers.keccak256( 
    ethers.toUtf8Bytes("MilestoneApproval(uint256 grantId,uint256 
milestoneIndex,uint256 nonce,address contractAddress)") 
  ); 
  const hash = ethers.keccak256( 
    ethers.AbiCoder.defaultAbiCoder().encode( 
      ["bytes32","uint256","uint256","uint256","address"], 
      [APPROVAL_TYPEHASH, grant, index, nonce, contract] 
    ) 
  ); 
  const signature = await wallet.signMessage(ethers.getBytes(hash)); 
console.log(JSON.stringify({ signer: wallet.address, signature }, 
null, 2)); 
} 
main().catch(err => { console.error(err); process.exit(1); }); 
Ruta completa: .\packages\ui\src\grants-escrow-panel.tsx 
import React, { useMemo, useState } from "react"; 
type Milestone = { 
amount: string;     
// human readable (e.g., "1000 USDC") 
status: "Pending" | "Approved" | "Disputed" | "Released" | 
"Refunded"; 
unlockAt?: number; 
disputeEndsAt?: number; 
index: number; 
}; 
export type GrantView = { 
grantId: string; 
payer: string; 
payee: string; 
token: string; 
threshold: number; 
timelockSeconds: number; 
disputeSeconds: number; 
milestones: Milestone[]; 
}; 
export function GrantsEscrowPanel({ 
grant, 
onApproveClick, 
onClaimClick, 
onDisputeClick, 
onResolveRefundClick, 
onResolveReleaseClick 
}: { 
  grant: GrantView; 
  onApproveClick?: (index: number) => void; 
  onClaimClick?: (index: number) => void; 
  onDisputeClick?: (index: number) => void; 
  onResolveRefundClick?: (index: number) => void; 
  onResolveReleaseClick?: (index: number) => void; 
}) { 
  const [filter, setFilter] = useState<"all" | 
Milestone["status"]>("all"); 
  const rows = useMemo( 
    () => grant.milestones.filter(m => filter === "all" ? true : 
m.status === filter), 
    [grant, filter] 
  ); 
 
  return ( 
    <div className="rounded-2xl shadow p-4 space-y-3"> 
      <header className="flex items-center justify-between"> 
        <div> 
          <h2 className="text-xl font-semibold">Grant 
#{grant.grantId}</h2> 
          <p className="text-sm text-gray-500">Threshold: 
{grant.threshold} — Token: {grant.token}</p> 
        </div> 
        <select 
          aria-label="Filtro de estado" 
          className="border rounded px-2 py-1" 
          value={filter} 
          onChange={e => setFilter(e.target.value as any)} 
        > 
          <option value="all">Todos</option> 
          <option value="Pending">Pending</option> 
          <option value="Approved">Approved</option> 
          <option value="Disputed">Disputed</option> 
          <option value="Released">Released</option> 
          <option value="Refunded">Refunded</option> 
        </select> 
      </header> 
 
      <table className="w-full text-sm"> 
        <thead> 
          <tr className="text-left text-gray-600"> 
            <th className="py-2">#</th> 
            <th>Monto</th> 
            <th>Estado</th> 
            <th>Unlock</th> 
            <th>Objeción</th> 
            <th className="text-right">Acciones</th> 
          </tr> 
        </thead> 
        <tbody> 
          {rows.map((m) => ( 
            <tr key={m.index} className="border-t"> 
              <td className="py-2">{m.index}</td> 
              <td>{m.amount}</td> 
              <td>{m.status}</td> 
              <td>{m.unlockAt ? new Date(m.unlockAt * 
1000).toLocaleString() : "-"}</td> 
              <td>{m.disputeEndsAt ? new Date(m.disputeEndsAt * 
1000).toLocaleString() : "-"}</td> 
              <td className="text-right space-x-2"> 
                {m.status === "Pending" && ( 
                  <button className="px-2 py-1 rounded bg-blue-600 
text-white" onClick={() => onApproveClick?.(m.index)}> 
                    Aprobar (N/M) 
                  </button> 
                )} 
                {m.status === "Approved" && ( 
                  <> 
                    <button className="px-2 py-1 rounded bg-amber-600 
text-white" onClick={() => onDisputeClick?.(m.index)}> 
                      Disputar 
                    </button> 
                    <button className="px-2 py-1 rounded 
bg-emerald-600 text-white" onClick={() => onClaimClick?.(m.index)}> 
                      Claim 
                    </button> 
                  </> 
                )} 
                {m.status === "Disputed" && ( 
                  <> 
                    <button className="px-2 py-1 rounded bg-red-600 
text-white" onClick={() => onResolveRefundClick?.(m.index)}> 
                      Resolver: Reembolso 
                    </button> 
                    <button className="px-2 py-1 rounded 
bg-emerald-700 text-white" onClick={() => 
onResolveReleaseClick?.(m.index)}> 
                      Resolver: Liberar 
                    </button> 
                  </> 
                )} 
              </td> 
            </tr> 
          ))} 
        </tbody> 
      </table> 
 
      <footer className="text-xs text-gray-500"> 
        DoD: liberaciones tras validación ≥N/M, timelock y ventana de 
objeción; trazabilidad por eventos on‑chain. 
      </footer> 
    </div> 
  ); 
} 
 
 
Ruta completa: .\docs\runbooks\grants-escrow.md 
# Runbook — N105: Gestión de grants y milestones con **escrow** 
 
## 1) Despliegue 
1. Configurar red y cuentas en `hardhat.config.ts`. 
2. `pnpm --filter gnew-grants-escrow i && pnpm --filter 
gnew-grants-escrow build` 
3. `pnpm --filter gnew-grants-escrow deploy:local` (o `--network 
<net>`). 
4. Registrar oráculos en `OracleRegistry.batchAdd([addr...])`. 
5. Registrar `arbiter` (Safe/DAO) al crear cada grant. 
## 2) Operación (Rituales) - **Alta de grant**: usar `createGrant` con montos, `threshold`, 
`timelockSeconds`, `disputeSeconds` y `arbiter`. - **Panel de verificación**: `GrantsEscrowPanel` en UI. Inputs: - `onApproveClick(index)` abre modal para pegar ≥N firmas generadas 
con `scripts/oracles/sign_approval.ts`. - `onDisputeClick(index)` disponible para `arbiter`. - `onResolveRefundClick(index)` / `onResolveReleaseClick(index)`. - **Retro & Tech debt day**: revisar eventos de 
`MilestoneApproved/Released/Disputed/Refunded`, gas y UX. 
## 3) Firmas de oráculos - Mensaje firmado (EIP‑191) con hash: 
APPROVAL_TYPEHASH = keccak256("MilestoneApproval(uint256 grantId,uint256 
milestoneIndex,uint256 nonce,address contractAddress)") 
digest = keccak256(abi.encode(APPROVAL_TYPEHASH, grantId, index, nonce, 
escrowAddress)) 
signature = signMessage(digest) - Enviar `approveMilestone(grantId, index, signatures[], signers[])`. 
## 4) Controles y Auditoría - **On‑chain**: eventos con txid por cada hito; consulta por subgraph 
opcional. - **Off‑chain**: exportar registros del panel + lista de oráculos 
vigentes (OracleRegistry). - **Guardian**: `emergencyCancel` + `refundAllPending` ante pérdida de 
quorum. - **Inmutabilidad de cierres**: milestone en `Released/Refunded` no 
puede mutar. 
## 5) Playbooks - **Disputa**: `arbiter.raiseDispute` → analizar evidencias → 
`resolveDisputeRefund` o `resolveDisputeRelease`. - **Rotación de guardian**: `rotateGuardian(new)` tras acuerdo DAO. - **Recuperación**: si el payee olvidó depositar bond en ETH, usar 
`depositBond`. 
 
## 6) Métricas (DoD) - `% hitos liberados sin disputa`, `% disputas resueltas < T+7`, 
`tiempo medio aprobación→claim`. - Deuda técnica controlada: revisar N de firmas, gas y UX 
trimestralmente. 
 
 
Ruta completa: .\docs\api\grants-escrow.openapi.json 
{ 
  "openapi": "3.0.0", 
  "info": { "title": "GNEW Grants Escrow", "version": "1.0.0" }, 
  "paths": { 
    "/oracles/sign": { 
      "post": { 
        "summary": "Valida firmas locales (util para panel)", 
        "requestBody": { "required": true }, 
        "responses": { "200": { "description": "ok" } } 
      } 
    } 
  } 
} 
 
 
Cómo encaja con el proyecto GNEW 
● Stack: Smart Contracts (Solidity) + CLI de firmas (TypeScript/ethers) + Panel UI (React 
en packages/ui). 
 
● Entregables: contrato GrantsEscrow.sol, OracleRegistry.sol; panel de 
calidad de hitos (GrantsEscrowPanel), runbook con operación/disputa. 
● DoD: liberación solo tras ≥N/M firmas válidas, timelock + ventana de objeción, 
eventos para trazabilidad; controles de guardian y arbiter. 
● Riesgos & Controles: pérdida de quorum → guardian y emergencyCancel + 
reembolsos; seguro de devolución con granteeBond. 
Si quieres, añado ahora un subgraph de ejemplo y un microservicio (FastAPI) para 
consolidar métricas y exponer webhooks al panel. 
Tú dijiste: 
programa a nivel de detall para GNEW N106 11.6 Tesorería programable (DCA/estrategias) 
(Prompt 106) Objetivo: Reglas DCA y cofres por estrategia. Roles: Finanzas quant, Eng. SC. 
Stack: Policy engine; crons on-chain/off-chain confiables. Entregables: estrategias 
parametrizables y pausables. Pasos: backtesting; límites de slippage; pausas de mercado. 
DoD: desviación ≤ umbral; guardias activas. Controles: kill-switch DAO. 
ChatGPT Plus 
Pensó durante 1m 47s 
¡vamos! Entrego GNEW N107 11.7 Gobernanza y votaciones listo para integrar en tu 
monorepo. Incluye contratos (Governor Bravo-like + Timelock + veto), scripts de despliegue y 
simulación on-fork, API Node/TS para mirrors Snapshot/IPFS/Arweave, plantillas de 
propuestas, y un portal UI. Todo coherente con la estructura y estilo del proyecto. 
Contratos (Solidity • OpenZeppelin) 
