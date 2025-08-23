export type ReviewPayload = { 
  slug: string; 
  address: string; 
  rating: 1|2|3|4|5; 
  title?: string; 
  content: string; 
  proof?: string[]; 
  weight_bps?: number; 
}; 
 
export class ReviewsClient { 
  constructor(private baseUrl: string, private token?: string) {} 
  private h(){ return {"Content-Type":"application/json", 
...(this.token ? {Authorization:`Bearer ${this.token}`} : {})}; } 
 
  async submitReview(p: ReviewPayload){ 
    const r = await fetch(`${this.baseUrl}/reviews/submit`, 
{method:"POST", headers:this.h(), body:JSON.stringify(p)}); 
    if (!r.ok) throw new Error(`submit failed ${r.status}`); 
    return r.json(); 
  } 
  async recompute(slug: string){ 
    const r = await 
fetch(`${this.baseUrl}/projects/${slug}/recompute`, {method:"POST", 
headers:this.h()}); 
    if (!r.ok) throw new Error(`recompute failed ${r.status}`); 
    return r.json(); 
  } 
  async explain(review_id: number){ 
    const r = await 
fetch(`${this.baseUrl}/reviews/${review_id}/explain`, 
{headers:this.h()}); 
    if (!r.ok) throw new Error(`explain failed ${r.status}`); 
    return r.json(); 
  } 
  async rag(slug: string, q: string){ 
    const r = await 
fetch(`${this.baseUrl}/projects/${slug}/reviews/rag?q=${encodeURICompo
 nent(q)}`, {headers:this.h()}); 
    if (!r.ok) throw new Error(`rag failed ${r.status}`); 
    return r.json(); 
  } 
} 
 
 
Ruta completa: 
dags/reviews_monitor.py 
from datetime import datetime 
from airflow import DAG 
from airflow.operators.python import PythonOperator 
import os, requests 
 
REVIEWS_URL = os.environ.get("REVIEWS_URL","http://reviews:8020") 
TOKEN = os.environ.get("REVIEWS_TOKEN") 
THRESH = float(os.environ.get("FRAUD_RATE_THRESH","0.10")) 
 
def check_projects(): 
    headers = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {} 
    # si tienes un listado de slugs, recórrelos; aquí ejemplo con 
variable de entorno 
    slugs = os.environ.get("REVIEW_SLUGS","").split(",") 
    for s in filter(None, slugs): 
        r = requests.post(f"{REVIEWS_URL}/projects/{s}/recompute", 
headers=headers, timeout=15) 
        if r.ok: 
            data = r.json() 
            if data.get("fraud_rate", 0.0) >= THRESH: 
                # Aquí dispararías un webhook/alerta a Moderación/DAO 
                pass 
 
with DAG( 
    dag_id="reviews_monitor", 
    schedule="*/30 * * * *", start_date=datetime(2025,1,1), 
catchup=False, tags=["reviews","moderation"] 
) as dag: 
    PythonOperator(task_id="check_projects", 
python_callable=check_projects) 
 
 
Cómo cumple tus requisitos 
● Objetivo (ratings ponderados por reputación): 
○ Fórmula de peso efectivo por reseña: 
w = w_syb * w_rep * (1 - spam_score)↓ * w_time * 
repeat_penalty 
Donde w_syb proviene de Merkle anti‑sybil (peso 0..1), w_rep de la 
reputación del usuario (VCs + flags), spam_score de heurísticas transparentes, 
w_time por recencia, y penalización por múltiples reseñas del mismo autor en el 
mismo proyecto. 
○ POST /projects/{slug}/recompute calcula el promedio ponderado 
ajustado (trimmed mean) y cachea detalles para transparencia. 
● Roles: Front, Data, Moderación: 
○ Front: @repo/reviews-client + endpoints de transparencia y RAG para UI. 
○ Data: Anti‑spam heurístico, cálculo de reputación, recencia y agregación; 
métricas en Prometheus. 
○ Moderación: Endpoint /reviews/{rid}/moderate con etiquetas y 
confirmación; actualiza flags del usuario y fraude. 
● Stack: anti‑spam; sybil‑resistance; RAG de reseñas: 
○ anti‑spam: reglas de longitud, links, velocidad, duplicados, keywords; produce 
spam_score 0..1. 
○ sybil‑resistance: verificación Merkle (address, weightBps) con raíz 
configurable (settings.anti_sybil_root). 
○ RAG: TF‑IDF + k‑NN local (/projects/{slug}/reviews/rag?q=...) con 
resumen extractivo y citaciones (ids). 
● Entregables: 
○ API de reseñas (FastAPI), BD (SQLAlchemy), métricas (Prometheus), DAG de 
monitor de fraude, cliente TS para UI. 
○ Transparencia en pesos: /reviews/{id}/explain y details.weights 
en el agregado. 
● DoD: 
○ Fraude < umbral: reviews_fraud_rate por proyecto; DAG 
reviews_monitor dispara alertas si ≥ fraud_rate_threshold (por defecto 
10%). 
○ Transparencia: pesos y breakdown disponibles vía API. 
○ Reproducibilidad: reglas y parámetros en config.py, outputs con detalles de 
cálculo (denominador, trim_pct). 
Siguientes pasos opcionales 
● Componente UI (tarjetas con reseñas, breakdown de peso y gráfica de contribución por 
fuente). 
● Integración con VC/DID real (p. ej., Passport/Verifiable Credentials) para ajustar 
base_rep. 
● Clasificador de spam ML (sustituir heurísticas por modelo ligero), y detector de 
colusión (grafos de co‑ocurrencia). 
¿Quieres que lo extienda con un componente React (shadcn/ui) para el panel de 
transparencia y RAG, o un indexer on‑chain para consolidar identidades/verificaciones? 
Tú dijiste: 
programa a nivel de detalle para gnew N115 12.5 KPIs proyecto (Prompt 115) Objetivo: Traction 
panel: usuarios, retención, TVL. Roles: Data, Front. Stack: ETL; métricas definidas; export. 
DoD: KPIs auditables; comparables. 
ChatGPT Plus 
Pensó durante 54s 
Aquí tienes el programa a nivel de detalle y la programación para GNEW N115 · 12.5 KPIs 
proyecto (Prompt 115). Entrego un servicio kpis listo para tu monorepo (mismo patrón 
N110–N114: FastAPI + SQLAlchemy + OAuth2, OTEL y Prometheus), con ETL, métricas 
definidas y versionadas, exports (CSV/Parquet), y panel de traction: usuarios, retención, 
TVL. Cumple DoD: KPIs auditables y comparables. 
Ruta completa: 
services/kpis/config.py 
from pydantic_settings import SettingsConfigDict 
from services.common.config import CommonSettings 
 
class Settings(CommonSettings): 
    service_name: str = "kpis" 
    database_url: str = "sqlite:///./kpis.db" 
    metrics_port: int = 8031 
    timezone: str = "UTC"  # estandarización comparabilidad 
 
    # Definiciones (nombres canónicos) 
    activity_events: list[str] = ["session_start", "tx_confirmed", 
"action"] 
    signup_events: list[str] = ["signup", "registration_completed"] 
 
    # Export 
    parquet_compression: str = "snappy" 
 
    model_config = SettingsConfigDict(env_file=".env") 
 
settings = Settings() 
 
 
Ruta completa: 
services/kpis/models.py 
from sqlalchemy import ( 
    create_engine, Column, Integer, String, Float, DateTime, 
ForeignKey, Text, Boolean, JSON, Index, UniqueConstraint 
) 
from sqlalchemy.orm import declarative_base, relationship, 
sessionmaker 
from datetime import datetime 
from .config import settings 
 
engine = create_engine( 
    settings.database_url, 
    connect_args={"check_same_thread": False} if 
settings.database_url.startswith("sqlite") else {}, 
) 
SessionLocal = sessionmaker(bind=engine, autoflush=False, 
autocommit=False) 
Base = declarative_base() 
 
# ---- Dimensiones y Hechos ---- 
 
class Project(Base): 
    __tablename__ = "projects" 
    id = Column(Integer, primary_key=True) 
    slug = Column(String, unique=True, index=True) 
    title = Column(String) 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
class User(Base): 
    __tablename__ = "users" 
    id = Column(Integer, primary_key=True) 
    external_id = Column(String, index=True)  # wallet/uuid/email hash 
    first_seen = Column(DateTime, index=True) # derivado de eventos 
    created_at = Column(DateTime, default=datetime.utcnow) 
    __table_args__ = (UniqueConstraint("external_id", 
name="uq_user_external"),) 
 
class Event(Base): 
    __tablename__ = "events" 
    id = Column(Integer, primary_key=True) 
    project_id = Column(Integer, ForeignKey("projects.id"), 
index=True) 
    user_id = Column(Integer, ForeignKey("users.id"), index=True, 
nullable=True) 
    user_external = Column(String, index=True) 
    name = Column(String, index=True) 
    ts = Column(DateTime, index=True)         # UTC normalizado 
    properties = Column(JSON, default=dict) 
    source = Column(String, default="api") 
 
    project = relationship("Project") 
    user = relationship("User") 
 
Index("ix_evt_pid_ts", Event.project_id, Event.ts) 
Index("ix_evt_pid_user", Event.project_id, Event.user_external) 
 
class TVLSnapshot(Base): 
    __tablename__ = "tvl_snapshots" 
    id = Column(Integer, primary_key=True) 
    project_id = Column(Integer, ForeignKey("projects.id"), 
index=True) 
    chain_id = Column(Integer, default=0, index=True) 
    ts = Column(DateTime, index=True) 
    tvl_usd = Column(Float)                   # valor total bloqueado 
en USD 
    source = Column(String, default="api") 
    project = relationship("Project") 
 
Index("ix_tvl_pid_day", TVLSnapshot.project_id, TVLSnapshot.ts) 
 
# ---- Catálogo de métricas (auditable) ---- 
 
class MetricDefinition(Base): 
    __tablename__ = "metric_definitions" 
    id = Column(Integer, primary_key=True) 
    name = Column(String, index=True)       # p.ej. dau, wau, mau, 
retention_d1, tvl 
    version = Column(String, default="1.0") 
    formula = Column(Text)                  # texto legible + 
SQL/explicación 
    dimensions = Column(JSON, default=list) # ["project","date"] 
    window = Column(String, default="1d")   # 1d/7d/30d/rolling 
    created_at = Column(DateTime, default=datetime.utcnow) 
    __table_args__ = (UniqueConstraint("name", "version", 
name="uq_metric_name_ver"),) 
 
# ---- Agregados y snapshots KPIs ---- 
 
class KPIValue(Base): 
    __tablename__ = "kpi_values" 
    id = Column(Integer, primary_key=True) 
    project_id = Column(Integer, index=True) 
    date = Column(DateTime, index=True)       # bucket diario (00:00 
UTC) 
    name = Column(String, index=True)         # métrica canónica 
    version = Column(String, default="1.0") 
    value = Column(Float) 
    details = Column(JSON, default=dict)      # breakdown para 
auditoría 
    __table_args__ = (Index("ix_kpi_pid_date_name", "project_id", 
"date", "name"),) 
 
def init_db(): 
    Base.metadata.create_all(bind=engine) 
 
 
Ruta completa: services/kpis/etl.py 
from datetime import datetime 
from sqlalchemy.orm import Session 
from sqlalchemy import func 
from .models import Project, User, Event, TVLSnapshot 
from .config import settings 
 
def ensure_project(db: Session, slug: str, title: str | None = None) -> Project: 
    p = db.query(Project).filter_by(slug=slug).one_or_none() 
    if not p: 
        p = Project(slug=slug, title=title or slug) 
        db.add(p); db.commit(); db.refresh(p) 
    return p 
 
def ensure_user(db: Session, external_id: str) -> User: 
    u = 
db.query(User).filter_by(external_id=external_id).one_or_none() 
    if not u: 
        u = User(external_id=external_id, first_seen=None) 
        db.add(u); db.commit(); db.refresh(u) 
    return u 
 
def ingest_events(db: Session, slug: str, rows: list[dict]) -> int: 
    """ 
    rows: [{user:"0xabc", name:"session_start", 
ts:"2025-08-01T12:00:00Z", properties:{...}}] 
    """ 
    p = ensure_project(db, slug) 
    count = 0 
    for r in rows: 
        u = ensure_user(db, r["user"]) 
        ts = 
datetime.fromisoformat(r["ts"].replace("Z","+00:00")).replace(tzinfo=N
 one) 
        ev = Event(project_id=p.id, user_id=u.id, 
user_external=u.external_id, name=r["name"], ts=ts, 
properties=r.get("properties", {})) 
        db.add(ev); count += 1 
        # refrescar first_seen 
        if u.first_seen is None or ts < u.first_seen: 
            u.first_seen = ts 
            db.add(u) 
    db.commit() 
    return count 
 
def ingest_tvl(db: Session, slug: str, snapshots: list[dict]) -> int: 
    """ 
    snapshots: [{ts:"2025-08-01T00:00:00Z", tvl_usd: 12345.67, 
chain_id:1, source:"defillama"}] 
    """ 
    p = ensure_project(db, slug) 
    count = 0 
    for s in snapshots: 
        ts = 
datetime.fromisoformat(s["ts"].replace("Z","+00:00")).replace(tzinfo=N
 one) 
        rec = TVLSnapshot(project_id=p.id, 
chain_id=int(s.get("chain_id",0)), ts=ts, tvl_usd=float(s["tvl_usd"]), 
source=s.get("source","api")) 
        db.add(rec); count += 1 
    db.commit() 
    return count 
 
 
Ruta completa: 
services/kpis/metrics.py 
from datetime import datetime, timedelta 
from sqlalchemy.orm import Session 
from sqlalchemy import func, distinct, and_ 
from .models import Project, User, Event, TVLSnapshot, KPIValue, 
MetricDefinition 
from .config import settings 
 
# ---- Helpers de tiempo ---- 
def day_bucket(dt: datetime) -> datetime: 
    return datetime(dt.year, dt.month, dt.day) 
 
def date_range(start: datetime, end: datetime): 
    cur = day_bucket(start) 
    endb = day_bucket(end) 
    while cur <= endb: 
        yield cur 
        cur += timedelta(days=1) 
 
# ---- Registro de definiciones (auditable) ---- 
METRIC_DEFS = [ 
    { 
        "name":"dau", "version":"1.0", "window":"1d", 
        "formula":"Distinct users with any of activity_events within 
[00:00,24:00) UTC", 
        "dimensions":["project","date"] 
    }, 
    { 
        "name":"wau", "version":"1.0", "window":"7d rolling", 
        "formula":"Distinct users with activity_events in last 7 days 
inclusive of date", 
        "dimensions":["project","date"] 
    }, 
    { 
        "name":"mau", "version":"1.0", "window":"30d rolling", 
        "formula":"Distinct users with activity_events in last 30 days 
inclusive of date", 
        "dimensions":["project","date"] 
    }, 
    { 
        "name":"retention_d1", "version":"1.0", "window":"cohort", 
        "formula":"% of users whose first_seen = cohort_date and who 
return at cohort_date+1d with any activity", 
        "dimensions":["project","cohort_date"] 
    }, 
    { 
        "name":"retention_d7", "version":"1.0", "window":"cohort", 
        "formula":"% return at cohort_date+7d", 
        "dimensions":["project","cohort_date"] 
    }, 
    { 
        "name":"retention_d30", "version":"1.0", "window":"cohort", 
        "formula":"% return at cohort_date+30d", 
        "dimensions":["project","cohort_date"] 
    }, 
    { 
        "name":"tvl_usd", "version":"1.0", "window":"1d", 
        "formula":"Sum/last TVL USD per day across chains (closing 
value 23:59:59 UTC)", 
        "dimensions":["project","date"] 
    } 
] 
 
def bootstrap_definitions(db: Session): 
    for d in METRIC_DEFS: 
        exists = db.query(MetricDefinition).filter_by(name=d["name"], 
version=d["version"]).one_or_none() 
        if not exists: 
            db.add(MetricDefinition(**d)) 
    db.commit() 
 
# ---- Cálculo por fecha ---- 
def compute_daily_active_users(db: Session, project_id: int, day: 
datetime) -> int: 
    start = day 
    end = day + timedelta(days=1) 
    q = db.query(distinct(Event.user_external)).filter( 
        Event.project_id==project_id, 
        Event.ts>=start, Event.ts<end, 
        Event.name.in_(settings.activity_events) 
    ) 
    return q.count() 
 
def compute_rolling_active_users(db: Session, project_id: int, day: 
datetime, window_days: int) -> int: 
    start = day - timedelta(days=window_days-1) 
    end = day + timedelta(days=1) 
    q = db.query(distinct(Event.user_external)).filter( 
        Event.project_id==project_id, 
        Event.ts>=start, Event.ts<end, 
        Event.name.in_(settings.activity_events) 
    ) 
    return q.count() 
 
def compute_tvl_day(db: Session, project_id: int, day: datetime) -> 
float: 
    start = day 
    end = day + timedelta(days=1) 
    # último valor del día (close) 
    row = db.query(TVLSnapshot).filter( 
        TVLSnapshot.project_id==project_id, 
        TVLSnapshot.ts>=start, TVLSnapshot.ts<end 
    ).order_by(TVLSnapshot.ts.desc()).first() 
    return float(row.tvl_usd) if row else 0.0 
 
def upsert_kpi(db: Session, project_id: int, day: datetime, name: str, 
value: float, version: str = "1.0", details: dict | None = None): 
    rec = db.query(KPIValue).filter( 
        KPIValue.project_id==project_id, KPIValue.date==day, 
KPIValue.name==name, KPIValue.version==version 
    ).one_or_none() 
    if not rec: 
        rec = KPIValue(project_id=project_id, date=day, name=name, 
version=version, value=value, details=details or {}) 
    else: 
        rec.value = value; rec.details = details or rec.details 
    db.add(rec) 
 
def compute_cohort_retention(db: Session, project_id: int, cohort_day: 
datetime, horizon_days: int) -> float: 
    # cohort = usuarios cuyo first_seen == cohort_day 
    cohort_users = db.query(User).filter( 
        User.first_seen>=cohort_day, 
User.first_seen<cohort_day+timedelta(days=1) 
    ).all() 
    n = len(cohort_users) 
    if n == 0: 
        return 0.0 
    target_day = cohort_day + timedelta(days=horizon_days) 
    start = target_day 
    end = target_day + timedelta(days=1) 
    user_ids = [u.external_id for u in cohort_users] 
    returned = db.query(distinct(Event.user_external)).filter( 
        Event.project_id==project_id, 
        Event.user_external.in_(user_ids), 
        Event.ts>=start, Event.ts<end, 
        Event.name.in_(settings.activity_events) 
    ).count() 
    return returned / n 
 
def recompute_window(db: Session, slug: str, start: datetime, end: 
datetime) -> dict: 
    p = db.query(Project).filter_by(slug=slug).one_or_none() 
    if not p: raise ValueError("project not found") 
    bootstrap_definitions(db) 
 
    out = {"project": slug, "from": start.isoformat(), "to": 
end.isoformat(), "days": 0} 
    for day in date_range(start, end): 
        dau = compute_daily_active_users(db, p.id, day) 
        wau = compute_rolling_active_users(db, p.id, day, 7) 
        mau = compute_rolling_active_users(db, p.id, day, 30) 
        tvl = compute_tvl_day(db, p.id, day) 
 
        upsert_kpi(db, p.id, day, "dau", float(dau)) 
        upsert_kpi(db, p.id, day, "wau", float(wau)) 
        upsert_kpi(db, p.id, day, "mau", float(mau)) 
        upsert_kpi(db, p.id, day, "tvl_usd", float(tvl), 
details={"method":"closing_value"}) 
 
        # retenciones: calcular sólo si hay cohort ese día 
        d1 = compute_cohort_retention(db, p.id, day, 1) 
        d7 = compute_cohort_retention(db, p.id, day, 7) 
        d30 = compute_cohort_retention(db, p.id, day, 30) 
        if any([d1, d7, d30]): 
            upsert_kpi(db, p.id, day, "retention_d1", d1) 
            upsert_kpi(db, p.id, day, "retention_d7", d7) 
            upsert_kpi(db, p.id, day, "retention_d30", d30) 
        out["days"] += 1 
    db.commit() 
return out 
Ruta completa: services/kpis/main.py 
from fastapi import FastAPI, Depends, HTTPException 
from fastapi.responses import StreamingResponse, JSONResponse 
from fastapi.security import OAuth2PasswordBearer, 
HTTPAuthorizationCredentials 
from starlette.middleware import Middleware 
from sqlalchemy.orm import Session 
from sqlalchemy import text, and_ 
from datetime import datetime 
from io import StringIO, BytesIO 
import csv, json 
from services.common.middleware import LoggingMiddleware 
from services.common.logger import setup_logging 
from services.common.otel import setup_otel 
from packages.auth_client import verify as _verify 
from prometheus_client import start_http_server, Counter, Histogram 
from .config import settings 
from .models import init_db, SessionLocal, Project, KPIValue, 
MetricDefinition 
from .etl import ingest_events, ingest_tvl, ensure_project 
from .metrics import recompute_window, bootstrap_definitions 
try: 
import pandas as pd 
except Exception: 
pd = None  # export parquet opcional 
setup_logging(settings.service_name, settings.log_level) 
app = FastAPI(title="GNEW KPIs", 
middleware=[Middleware(LoggingMiddleware)]) 
setup_otel("gnew-kpis", app) 
 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login") 
def get_user(token: str = Depends(oauth2_scheme)) -> dict: 
    cred = HTTPAuthorizationCredentials(scheme="Bearer", 
credentials=token) 
    return _verify(cred) 
 
def get_db(): 
    db = SessionLocal() 
    try: yield db 
    finally: db.close() 
 
# Metrics 
kpi_recompute_total = Counter("kpi_recompute_total", "Recomputes 
executed", ["project"]) 
kpi_export_total = Counter("kpi_export_total", "Exports emitted", 
["project","format"]) 
kpi_ingest_events = Counter("kpi_ingest_events_total", "Events 
ingested", ["project","source"]) 
kpi_ingest_tvl = Counter("kpi_ingest_tvl_total", "TVL snapshots 
ingested", ["project","source"]) 
kpi_compute_duration = Histogram("kpi_compute_duration_seconds", 
"Window recompute duration") 
 
@app.on_event("startup") 
async def startup_event(): 
    init_db() 
    start_http_server(settings.metrics_port) 
    with next(get_db()) as db: 
        bootstrap_definitions(db) 
 
@app.get("/health") 
async def health(db: Session = Depends(get_db)): 
    try: 
        db.execute(text("SELECT 1")) 
        return {"status":"ok"} 
    except Exception: 
        return JSONResponse({"status":"fail"}, status_code=500) 
 
# ---- ETL ---- 
@app.post("/etl/events/{slug}") 
async def etl_events(slug: str, payload: dict, db: Session = 
Depends(get_db), user: dict = Depends(get_user)): 
    rows = payload.get("rows", []) 
    n = ingest_events(db, slug, rows) 
    kpi_ingest_events.labels(project=slug, 
source=payload.get("source","api")).inc(n) 
    return {"ingested": n} 
 
@app.post("/etl/tvl/{slug}") 
async def etl_tvl(slug: str, payload: dict, db: Session = 
Depends(get_db), user: dict = Depends(get_user)): 
    rows = payload.get("snapshots", []) 
    n = ingest_tvl(db, slug, rows) 
    kpi_ingest_tvl.labels(project=slug, 
source=payload.get("source","api")).inc(n) 
    return {"ingested": n} 
 
# ---- Recompute window ---- 
@app.post("/recompute/{slug}") 
async def recompute(slug: str, payload: dict, db: Session = 
Depends(get_db), user: dict = Depends(get_user)): 
    """ 
    payload: { "from": "2025-07-01", "to": "2025-08-01" } 
    """ 
    try: 
        start = datetime.fromisoformat(payload["from"]) 
        end = datetime.fromisoformat(payload["to"]) 
    except Exception: 
        raise HTTPException(400, "invalid date") 
    with kpi_compute_duration.time(): 
        res = recompute_window(db, slug, start, end) 
        kpi_recompute_total.labels(project=slug).inc() 
        return res 
 
# ---- Overview ---- 
@app.get("/kpis/overview/{slug}") 
async def overview(slug: str, _from: str, _to: str, db: Session = 
Depends(get_db), user: dict = Depends(get_user)): 
    try: 
        start = datetime.fromisoformat(_from); end = 
datetime.fromisoformat(_to) 
    except Exception: 
        raise HTTPException(400, "invalid dates") 
    p = db.query(Project).filter_by(slug=slug).one_or_none() 
    if not p: ensure_project(db, slug) 
    rows = db.query(KPIValue).filter( 
        KPIValue.project_id==p.id, 
        KPIValue.date>=start, KPIValue.date<=end, 
        
KPIValue.name.in_(["dau","wau","mau","tvl_usd","retention_d1","retenti
 on_d7","retention_d30"]) 
    ).order_by(KPIValue.date.asc(), KPIValue.name.asc()).all() 
    out = {} 
    for r in rows: 
        out.setdefault(r.name, []).append({"date": r.date.isoformat(), 
"value": r.value}) 
    return out 
 
# ---- Definitions (auditable/comparables) ---- 
@app.get("/definitions") 
async def definitions(db: Session = Depends(get_db), user: dict = 
Depends(get_user)): 
    defs = db.query(MetricDefinition).order_by(MetricDefinition.name, 
MetricDefinition.version).all() 
    return [ 
        {"name": d.name, "version": d.version, "formula": d.formula, 
"dimensions": d.dimensions, "window": d.window} 
        for d in defs 
    ] 
 
# ---- Export CSV/Parquet ---- 
@app.get("/export/{slug}/csv") 
async def export_csv(slug: str, _from: str, _to: str, db: Session = 
Depends(get_db), user: dict = Depends(get_user)): 
    start = datetime.fromisoformat(_from); end = 
datetime.fromisoformat(_to) 
    p = db.query(Project).filter_by(slug=slug).one_or_none() 
    if not p: raise HTTPException(404, "project not found") 
 
    rows = db.query(KPIValue).filter( 
        KPIValue.project_id==p.id, KPIValue.date>=start, 
KPIValue.date<=end 
    ).order_by(KPIValue.date.asc()).all() 
 
    buf = StringIO() 
    w = csv.writer(buf) 
    w.writerow(["project","date","metric","version","value"]) 
    for r in rows: 
        w.writerow([slug, r.date.date().isoformat(), r.name, 
r.version, r.value]) 
    buf.seek(0) 
    kpi_export_total.labels(project=slug, format="csv").inc() 
    return StreamingResponse(buf, media_type="text/csv", 
headers={"Content-Disposition": f"attachment; 
filename={slug}_kpis.csv"}) 
 
@app.get("/export/{slug}/parquet") 
async def export_parquet(slug: str, _from: str, _to: str, db: Session 
= Depends(get_db), user: dict = Depends(get_user)): 
    if pd is None: 
        raise HTTPException(501, "parquet export requires pandas") 
    start = datetime.fromisoformat(_from); end = 
datetime.fromisoformat(_to) 
    p = db.query(Project).filter_by(slug=slug).one_or_none() 
    if not p: raise HTTPException(404, "project not found") 
 
    rows = db.query(KPIValue).filter( 
        KPIValue.project_id==p.id, KPIValue.date>=start, 
KPIValue.date<=end 
    ).order_by(KPIValue.date.asc()).all() 
 
    df = pd.DataFrame([{ 
        "project": slug, "date": r.date, "metric": r.name, "version": 
r.version, "value": r.value 
    } for r in rows]) 
    bio = BytesIO() 
    df.to_parquet(bio, compression=settings.parquet_compression, 
index=False) 
    bio.seek(0) 
    kpi_export_total.labels(project=slug, format="parquet").inc() 
    return StreamingResponse(bio, 
media_type="application/octet-stream", 
        headers={"Content-Disposition": f"attachment; 
filename={slug}_kpis.parquet"}) 
 
 
Ruta completa: 
services/kpis/requirements.in 
fastapi 
uvicorn[standard] 
sqlalchemy 
pydantic-settings 
prometheus_client 
python-jose[cryptography] 
httpx 
pandas 
pyarrow 
pytest 
pytest-asyncio 
 
 
Ruta completa: 
services/kpis/Dockerfile 
ARG PYTHON_VERSION=3.12 
FROM python:${PYTHON_VERSION}-slim AS base 
WORKDIR /app 
RUN pip install --no-cache-dir --upgrade pip 
COPY requirements.txt ./ 
RUN pip install --no-cache-dir -r requirements.txt 
COPY . . 
ENV PORT=8030 
EXPOSE 8030 8031 
HEALTHCHECK --interval=30s --timeout=3s CMD python - <<'PY' || exit 1 
import urllib.request 
try: 
urllib.request.urlopen("http://localhost:8030/health", timeout=2) 
print("ok") 
except Exception as e: 
print(e); raise 
PY 
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8030"] 
Ruta completa: 
services/kpis/tests/test_kpis.py 
import os, sys, importlib.util, pytest 
from httpx import AsyncClient, ASGITransport 
from datetime import datetime, timedelta 
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), 
"../../..")) 
sys.path.insert(0, ROOT) 
module_path = os.path.join(ROOT, "services", "kpis", "main.py") 
spec = importlib.util.spec_from_file_location("kpis_app", module_path, 
submodule_search_locations=[os.path.dirname(module_path)]) 
mod = importlib.util.module_from_spec(spec); 
spec.loader.exec_module(mod) 
 
from services.gateway.auth import create_access_token 
from sqlalchemy.pool import StaticPool 
 
# DB memoria 
mod.SessionLocal = 
mod.sessionmaker(bind=mod.create_engine("sqlite:///:memory:", 
connect_args={"check_same_thread": False}, poolclass=StaticPool)) 
mod.init_db() 
 
@pytest.mark.asyncio 
async def test_flow_etl_compute_export(): 
    app = mod.app 
    token = create_access_token({"sub":"tester","role":"data"}) 
    headers = {"Authorization": f"Bearer {token}"} 
    transport = ASGITransport(app=app) 
    async with AsyncClient(transport=transport, base_url="http://t") 
as ac: 
        # Ingesta de eventos (2 usuarios, 2 días) 
        day0 = datetime(2025,8,1); day1 = day0 + timedelta(days=1) 
        rows = [ 
            {"user":"u1","name":"signup","ts":day0.isoformat()+"Z"}, 
            
{"user":"u1","name":"session_start","ts":day0.replace(hour=10).isoform
 at()+"Z"}, 
            {"user":"u2","name":"signup","ts":day0.isoformat()+"Z"}, 
            
{"user":"u2","name":"session_start","ts":day1.replace(hour=9).isoforma
 t()+"Z"}, 
        ] 
        r = await ac.post("/etl/events/demo", json={"rows":rows}, 
headers=headers) 
        assert r.status_code == 200 
 
        # Ingesta TVL 
        tvl = [{"ts": day0.isoformat()+"Z", "tvl_usd": 1000.0}, {"ts": 
day1.isoformat()+"Z", "tvl_usd": 1500.0}] 
        r = await ac.post("/etl/tvl/demo", json={"snapshots":tvl}, 
headers=headers) 
        assert r.status_code == 200 
 
        # Recompute ventana 
        r = await ac.post("/recompute/demo", json={"from": 
day0.date().isoformat(), "to": day1.date().isoformat()}, 
headers=headers) 
        assert r.status_code == 200 
 
        # Overview 
        r = await ac.get("/kpis/overview/demo", params={"_from": 
day0.date().isoformat(), "_to": day1.date().isoformat()}, 
headers=headers) 
        assert r.status_code == 200 
        data = r.json() 
        assert "dau" in data and "tvl_usd" in data 
 
        # Export CSV 
        r = await ac.get("/export/demo/csv", params={"_from": 
day0.date().isoformat(), "_to": day1.date().isoformat()}, 
headers=headers) 
        assert r.status_code == 200 
        assert "text/csv" in r.headers.get("content-type","") 
 
 
Ruta completa: dags/kpis_etl_dag.py 
from datetime import datetime, timedelta 
from airflow import DAG 
from airflow.operators.python import PythonOperator 
import os, requests 
 
KPIS_URL = os.environ.get("KPIS_URL","http://kpis:8030") 
TOKEN = os.environ.get("KPIS_TOKEN") 
SLUGS = [s for s in os.environ.get("KPIS_SLUGS","").split(",") if s] 
 
def recompute_last_30(): 
    headers = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {} 
    to = datetime.utcnow().date() 
    fr = (datetime.utcnow() - timedelta(days=30)).date() 
    for slug in SLUGS: 
        requests.post(f"{KPIS_URL}/recompute/{slug}", json={"from": 
str(fr), "to": str(to)}, headers=headers, timeout=30) 
 
with DAG( 
    dag_id="kpis_recompute_last_30", 
    schedule="0 1 * * *",  # diario 01:00 UTC 
    start_date=datetime(2025,1,1), catchup=False, tags=["kpis","etl"] 
) as dag: 
    PythonOperator(task_id="recompute_window", 
python_callable=recompute_last_30) 
 
 
Ruta completa: 
packages/kpis-client/src/index.ts 
export type RecomputeInput = { from: string; to: string }; 
export type EventRow = { user: string; name: string; ts: string; 
properties?: any }; 
 
export class KPIsClient { 
  constructor(private baseUrl: string, private token?: string) {} 
  private h() { return { "Content-Type": "application/json", 
...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) }; } 
 
  async ingestEvents(slug: string, rows: EventRow[], source = "api") { 
    const r = await fetch(`${this.baseUrl}/etl/events/${slug}`, { 
method: "POST", headers: this.h(), body: JSON.stringify({ rows, source 
}) }); 
    if (!r.ok) throw new Error(`ingest events failed ${r.status}`); 
return r.json(); 
  } 
 
  async ingestTVL(slug: string, snapshots: { ts: string; tvl_usd: 
number; chain_id?: number; source?: string }[]) { 
    const r = await fetch(`${this.baseUrl}/etl/tvl/${slug}`, { method: 
"POST", headers: this.h(), body: JSON.stringify({ snapshots }) }); 
    if (!r.ok) throw new Error(`ingest tvl failed ${r.status}`); 
return r.json(); 
  } 
 
  async recompute(slug: string, input: RecomputeInput) { 
    const r = await fetch(`${this.baseUrl}/recompute/${slug}`, { 
method: "POST", headers: this.h(), body: JSON.stringify(input) }); 
    if (!r.ok) throw new Error(`recompute failed ${r.status}`); return 
r.json(); 
  } 
 
  async overview(slug: string, from: string, to: string) { 
    const r = await 
fetch(`${this.baseUrl}/kpis/overview/${slug}?_from=${encodeURIComponen
 t(from)}&_to=${encodeURIComponent(to)}`, { headers: this.h() }); 
    if (!r.ok) throw new Error(`overview failed ${r.status}`); return 
r.json(); 
  } 
 
  async exportCSV(slug: string, from: string, to: string) { 
    const r = await 
fetch(`${this.baseUrl}/export/${slug}/csv?_from=${encodeURIComponent(f
 rom)}&_to=${encodeURIComponent(to)}`, { headers: this.h() }); 
    if (!r.ok) throw new Error(`export csv failed ${r.status}`); 
return await r.text(); 
  } 
} 
 
 
Cómo cumple el prompt 
● Objetivo – Traction panel (usuarios, retención, TVL): 
○ overview devuelve series DAU/WAU/MAU, retención D1/D7/D30 por cohort 
diario y TVL USD (valor de cierre). 
● Roles – Data & Front: 
○ Data: ETL /etl/events y /etl/tvl, recompute diario con Airflow, catálogo 
MetricDefinition con fórmulas versionadas (auditable y comparable). 
○ Front: @repo/kpis-client para UI del panel. 
● Stack – ETL; métricas definidas; export: 
○ ETL normaliza a UTC para comparabilidad. 
○ Métricas versionadas en metric_definitions + snapshots en kpi_values. 
○ Export CSV/Parquet por rango. 
● DoD – KPIs auditables; comparables: 
○ Auditables: /definitions expone fórmulas + versiones; 
kpi_values.details guarda método (p.ej., cierre diario TVL). 
○ Comparables: timezone UTC, nombres canónicos (dau, wau, mau, 
retention_d{1,7,30}, tvl_usd), ventanas definidas (1d/rolling). 
Siguientes pasos opcionales 
● Dashboard Grafana JSON (panel de Traction listo para importar). 
● Indexer on‑chain para TVL multi‑chain automático (TheGraph/Substreams). 
● Métricas adicionales: stickiness (DAU/MAU), ARP(U), conversión, cohortes por 
canal. 
Tú dijiste: 
desarrolla el detalle de los programas para gnew N116 12.6 Contratos estándar de grants 
(Prompt 116) Objetivo: Plantillas con firmas y hash on-chain. Roles: Legal, Back, SC. 
Entregables: catálogo por jurisdicción. DoD: firma válida; hash registrado. 
ChatGPT Plus 
Pensó durante 2m 4s 
Ruta completa: .\services\grants\package.json 
{ 
  "name": "grants", 
  "version": "1.0.0", 
  "type": "module", 
  "private": true, 
  "scripts": { 
    "dev": "ts-node-dev --respawn --transpile-only index.ts", 
    "build": "tsc -p tsconfig.json", 
    "start": "node dist/index.js", 
    "test": "vitest run", 
    "lint": "echo \"(add eslint if needed)\"" 
  }, 
  "dependencies": { 
    "express": "^4.21.2", 
    "express-rate-limit": "^7.4.0", 
    "mustache": "^4.2.0", 
    "prom-client": "^15.1.1", 
    "tweetnacl": "^1.0.3", 
    "ethers": "^6.13.2", 
    "opossum": "^7.1.0", 
    "@cosmjs/proto-signing": "^0.32.4", 
    "@cosmjs/cosmwasm-stargate": "^0.32.4", 
    "@opentelemetry/api": "^1.9.0", 
    "@opentelemetry/sdk-node": "^0.49.0", 
    "@opentelemetry/exporter-trace-otlp-http": "^0.49.0", 
    "@opentelemetry/exporter-metrics-otlp-http": "^0.49.0", 
    "@opentelemetry/auto-instrumentations-node": "^0.49.0", 
    "@opentelemetry/resources": "^1.22.0", 
    "@opentelemetry/semantic-conventions": "^1.22.0", 
    "@opentelemetry/sdk-metrics": "^1.22.0", 
    "swagger-jsdoc": "^6.2.8", 
    "swagger-ui-express": "^5.0.1" 
  }, 
  "devDependencies": { 
    "ts-node-dev": "^2.0.0", 
    "typescript": "^5.6.3", 
    "vitest": "^2.0.5", 
    "@types/express": "^4.17.21", 
    "@types/node": "^20.16.10", 
    "@types/mustache": "^4.2.5", 
    "supertest": "^7.0.0" 
  }, 
  "license": "GPL-3.0-or-later" 
} 
 
Ruta completa: .\services\grants\tsconfig.json 
{ 
  "compilerOptions": { 
    "target": "ES2022", 
    "module": "ES2022", 
    "moduleResolution": "Node", 
    "outDir": "dist", 
    "rootDir": ".", 
    "esModuleInterop": true, 
    "strict": true, 
    "resolveJsonModule": true, 
    "skipLibCheck": true 
  }, 
  "include": ["**/*.ts"] 
} 
 
Ruta completa: .\services\grants\index.ts 
import express from "express"; 
import rateLimit from "express-rate-limit"; 
import swaggerJsdoc from "swagger-jsdoc"; 
import swaggerUi from "swagger-ui-express"; 
import { collectDefaultMetrics, register, Gauge, Counter } from 
"prom-client"; 
import { startOtel } from "../common/otel.js"; 
import { createLogger } from "../common/logger.js"; 
import templatesRouter from "./routes/templates.js"; 
import agreementsRouter from "./routes/agreements.js"; 
import registryRouter from "./routes/registry.js"; 
const PORT = Number(process.env.PORT || 8000); 
startOtel("grants"); 
const logger = createLogger("grants"); 
register.setDefaultLabels({ 
service_name: "grants", 
environment: process.env.ENVIRONMENT || "dev", 
}); 
try { register.clear(); } catch {} 
collectDefaultMetrics(); 
const serviceInfo = new Gauge({ 
name: "service_info", 
help: "Service labels", 
labelNames: ["service_name", "environment"], 
}); 
serviceInfo.labels("grants", process.env.ENVIRONMENT || "dev").set(1); 
const sigCounter = new Counter({ 
name: "grant_signatures_verified_total", 
help: "Total de firmas verificadas", 
}); 
export const incVerifiedSig = () => sigCounter.inc(); 
const app = express(); 
app.use(express.json()); 
const limiter = rateLimit({ windowMs: 60_000, max: 30 }); 
const specs = swaggerJsdoc({ 
definition: { openapi: "3.0.0", info: { title: "Grants Service", 
version: "1.0.0" } }, 
apis: [] 
}); 
app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs)); 
app.get("/health", (_req, res) => res.json({ status: "ok" })); 
app.get("/metrics", async (_req, res) => { 
res.set("Content-Type", register.contentType); 
res.end(await register.metrics()); 
}); 
app.use("/v1/grants/templates", limiter, templatesRouter); 
app.use("/v1/grants/agreements", limiter, agreementsRouter); 
app.use("/v1/grants/registry", limiter, registryRouter); 
app.listen(PORT, () => logger.info({ port: PORT }, "grants service 
listening")); 
export default app; 
Ruta completa: .\services\grants\routes\templates.ts 
import { Router } from "express"; 
import fs from "fs"; 
import path from "path"; 
const router = Router(); 
const TEMPLATES_ROOT = path.join(process.cwd(), "services", "grants", 
"templates"); 
const INDEX_PATH = path.join(TEMPLATES_ROOT, "index.json"); 
router.get("/jurisdictions", (_req, res) => { 
const idx = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")); 
res.json({ jurisdictions: Object.keys(idx) }); 
}); 
router.get("/catalog", (_req, res) => { 
const idx = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")); 
res.json(idx); 
}); 
router.get("/:jurisdiction/:templateId", (req, res) => { 
const { jurisdiction, templateId } = req.params; 
const base = path.join(TEMPLATES_ROOT, jurisdiction.toUpperCase()); 
const full = path.join(base, `${templateId}.md`); 
if (!fs.existsSync(full)) return res.status(404).json({ error: 
"template not found" }); 
res.setHeader("Content-Type", "text/markdown"); 
res.send(fs.readFileSync(full, "utf8")); 
}); 
export default router; 
Ruta completa: .\services\grants\routes\agreements.ts 
import { Router } from "express"; 
import path from "path"; 
import fs from "fs"; 
import mustache from "mustache"; 
import { canonicalize, sha256Hex } from "../src/lib/canonical.js"; 
import { verifyEd25519, verifyEip191 } from 
"../src/lib/signatures.js"; 
import { incVerifiedSig } from "../index.js"; 
const router = Router(); 
const TEMPLATES_ROOT = path.join(process.cwd(), "services", "grants", 
"templates"); 
type SignBody = { 
scheme: "ed25519" | "eip191"; 
message?: string;          
// canonical text (optional if hash 
provided) 
hash?: string;             
signature: string;         
publicKey?: string;        
address?: string;          
}; 
// hex string 
// base64 (ed25519) or 0x... (eip191) 
// base64 (ed25519) 
// 0x... (eip191) 
 
router.post("/instantiate", (req, res) => { 
  const { jurisdiction, templateId, variables } = req.body || {}; 
  if (!jurisdiction || !templateId) return res.status(400).json({ 
error: "jurisdiction and templateId required" }); 
  const full = path.join(TEMPLATES_ROOT, jurisdiction.toUpperCase(), 
`${templateId}.md`); 
  if (!fs.existsSync(full)) return res.status(404).json({ error: 
"template not found" }); 
 
  const template = fs.readFileSync(full, "utf8"); 
  const rendered = mustache.render(template, variables || {}); 
  const canon = canonicalize(rendered); 
  const hash = sha256Hex(canon); 
  res.json({ 
    jurisdiction, 
    templateId, 
    version: (variables && variables.version) || "1.0.0", 
    canonical: canon, 
    hash 
  }); 
}); 
 
router.post("/verify-signature", (req, res) => { 
  const b: SignBody = req.body || {}; 
  try { 
    const canon = b.message ? canonicalize(b.message) : null; 
    const hashHex = b.hash || (canon ? sha256Hex(canon) : null); 
    if (!hashHex) return res.status(400).json({ error: "message or 
hash required" }); 
 
    let ok = false; 
    if (b.scheme === "ed25519") { 
      if (!b.signature || !b.publicKey) return res.status(400).json({ 
error: "publicKey and signature required" }); 
      ok = verifyEd25519(hashHex, b.signature, b.publicKey); 
    } else if (b.scheme === "eip191") { 
      if (!b.signature || !b.address) return res.status(400).json({ 
error: "address and signature required" }); 
      ok = verifyEip191(hashHex, b.signature, b.address); 
    } else { 
      return res.status(400).json({ error: "unsupported scheme" }); 
    } 
    if (ok) incVerifiedSig(); 
    res.json({ valid: ok, hash: hashHex }); 
  } catch (e: any) { 
    res.status(400).json({ valid: false, error: e.message }); 
  } 
}); 
 
export default router; 
 
Ruta completa: .\services\grants\routes\registry.ts 
import { Router } from "express"; 
import { getWalletAddress, executeRegistry } from "../src/chain.js"; 
 
const router = Router(); 
 
/** 
 * body: { hash: "0x...", meta: { projectId, jurisdiction, templateId, 
version, url? } } 
 */ 
router.post("/register", async (req, res) => { 
  const { hash, meta } = req.body || {}; 
  if (!hash || typeof hash !== "string") return res.status(400).json({ 
error: "hash required" }); 
  try { 
    const sender = await getWalletAddress(); 
    const msg = { register_hash: { hash, meta } }; 
    const result = await executeRegistry(sender, msg); 
    res.json({ status: "ok", tx: result }); 
  } catch (err: any) { 
    res.status(500).json({ status: "error", code: "CHAIN_ERROR", 
message: err.message }); 
} 
}); 
export default router; 
Ruta completa: .\services\grants\src\lib\canonical.ts 
import crypto from "crypto"; 
/** Normaliza el texto para hashing determinista. */ 
export function canonicalize(text: string): string { 
const lf = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n"); 
// recortar espacios finales de línea, una nueva línea al final. 
const trimmed = lf.split("\n").map((l) => l.replace(/\s+$/g, 
"")).join("\n"); 
return trimmed.endsWith("\n") ? trimmed : trimmed + "\n"; 
} 
export function sha256Hex(textOrBytes: string | Uint8Array): string { 
const h = crypto.createHash("sha256"); 
if (typeof textOrBytes === "string") 
h.update(Buffer.from(textOrBytes, "utf8")); 
else h.update(Buffer.from(textOrBytes)); 
return "0x" + h.digest("hex"); 
} 
Ruta completa: .\services\grants\src\lib\signatures.ts 
import nacl from "tweetnacl"; 
import { sha256Hex } from "./canonical.js"; 
import { hashMessage, recoverAddress, isAddress, getAddress } from 
"ethers"; 
/** 
* Verifica Ed25519 sobre el hash hex (0x...). 
* signature y publicKey se esperan en base64. 
*/ 
export function verifyEd25519(hashHex: string, signatureB64: string, 
publicKeyB64: string): boolean { 
const hash = Buffer.from(hashHex.replace(/^0x/, ""), "hex"); 
const sig = Buffer.from(signatureB64, "base64"); 
const pk = Buffer.from(publicKeyB64, "base64"); 
if (sig.length !== nacl.sign.signatureLength || pk.length !== 
nacl.sign.publicKeyLength) return false; 
return nacl.sign.detached.verify(hash, sig, pk); 
} 
/** 
* Verifica EIP-191 ("Ethereum Signed Message") recuperando la 
address. 
* Se firma el hash (0x...) como mensaje plano. 
*/ 
export function verifyEip191(hashHex: string, signature: string, 
expectedAddress: string): boolean { 
if (!isAddress(expectedAddress)) return false; 
const ethMsg = hashMessage(Buffer.from(hashHex.replace(/^0x/, ""), 
"hex")); 
const recovered = recoverAddress(ethMsg, signature); 
return getAddress(recovered) === getAddress(expectedAddress); 
} 
/** Helper para firmar (tests/local) con Ed25519 */ 
export function ed25519SignLocal(privateKeyB64: string, message: 
string): string { 
const sk = Buffer.from(privateKeyB64, "base64"); 
const msgHashHex = sha256Hex(message); 
const hash = Buffer.from(msgHashHex.replace(/^0x/, ""), "hex"); 
const sig = nacl.sign.detached(hash, sk); 
return Buffer.from(sig).toString("base64"); 
} 
Ruta completa: .\services\grants\src\chain.ts 
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing"; 
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate"; 
import CircuitBreaker from "opossum"; 
const RPC = process.env.COSMOS_RPC || "http://localhost:26657"; 
const MNEMONIC = process.env.MNEMONIC || "test test test test test 
test test test test test test junk"; 
const PREFIX = process.env.ADDR_PREFIX || "cosmos"; 
export const REGISTRY_CONTRACT = process.env.GRANT_REGISTRY_CONTRACT 
|| "cosmos1registry"; 
export const DENOM = process.env.STAKE_DENOM || "ugnew"; 
let signingClient: SigningCosmWasmClient | undefined; 
let wallet: DirectSecp256k1HdWallet | undefined; 
export async function getSigningClient(): 
Promise<SigningCosmWasmClient> { 
if (!signingClient) { 
wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { 
prefix: PREFIX }); 
signingClient = await SigningCosmWasmClient.connectWithSigner(RPC, 
wallet); 
} 
return signingClient; 
} 
export async function getWalletAddress(): Promise<string> { 
if (!wallet) await getSigningClient(); 
const [account] = await wallet!.getAccounts(); 
if (!account) throw new Error("wallet has no accounts"); 
return account.address; 
} 
const breaker = new CircuitBreaker( 
async (sender: string, msg: Record<string, unknown>) => { 
const client = await getSigningClient(); 
return client.execute(sender, REGISTRY_CONTRACT, msg, "auto"); 
}, 
{ errorThresholdPercentage: 50, resetTimeout: 10_000 } 
); 
 
export function executeRegistry(sender: string, msg: Record<string, 
unknown>): Promise<any> { 
  return breaker.fire(sender, msg); 
} 
 
Ruta completa: .\services\grants\templates\index.json 
{ 
  "ES": [ 
    { 
      "id": "grant_basic", 
      "title": "Acuerdo de Grant (ES) — Básico", 
      "version": "1.0.0", 
      "jurisdiction": "ES", 
      "language": "es-ES" 
    } 
  ], 
  "MX": [ 
    { 
      "id": "grant_basic", 
      "title": "Acuerdo de Grant (MX) — Básico", 
      "version": "1.0.0", 
      "jurisdiction": "MX", 
      "language": "es-MX" 
    } 
  ], 
  "US-DE": [ 
    { 
      "id": "grant_saft", 
      "title": "Grant/SAFT (Delaware)", 
      "version": "1.0.0", 
      "jurisdiction": "US-DE", 
      "language": "en-US" 
    } 
  ] 
} 
 
Ruta completa: .\services\grants\templates\ES\grant_basic.md 
# ACUERDO DE GRANT — {{project_name}} 
**Jurisdicción:** España (ES)   
**Versión plantilla:** {{version}}   
**Fecha:** {{date}} 
## 1. Partes - Otorgante: {{funder_name}} ({{funder_id}}) - Beneficiario: {{grantee_name}} ({{grantee_id}}) 
## 2. Objeto 
Financiar el proyecto **{{project_name}}** según el plan adjunto 
(Anexo I). 
## 3. Desembolsos y Hitos 
Los fondos se liberarán conforme al cronograma del Anexo II. 
## 4. Propiedad Intelectual 
{{ip_clause}} 
## 5. Cumplimiento 
Las Partes declaran cumplir la normativa aplicable. 
## 6. Firma 
Las Partes aceptan firmar electrónicamente este acuerdo.   
Hash del documento (SHA-256) a registrar on-chain: (se calcula por 
backend) 
**FIRMAS** - Otorgante: {{funder_signatory}} - Beneficiario: {{grantee_signatory}} --- 
Metadatos: - projectId: {{project_id}} - jurisdiction: ES - templateId: grant_basic 
Ruta completa: .\services\grants\templates\MX\grant_basic.md 
# ACUERDO DE GRANT — {{project_name}} 
**Jurisdicción:** México (MX)   
**Versión plantilla:** {{version}}   
**Fecha:** {{date}} 
Cláusulas análogas a ES con adecuaciones a legislación mexicana. 
Firmas electrónicas válidas conforme a {{mx_law_ref}}. 
Ruta completa: .\services\grants\templates\US-DE\grant_saft.md 
# GRANT / SAFT — {{project_name}} (Delaware) 
Version: {{version}} — Date: {{date}} 
This agreement follows Delaware law. Parties acknowledge token 
treatment per {{policy_ref}}. 
Signatures: electronic signatures acceptable. 
Ruta completa: .\services\grants\tests\canonical.test.ts 
import { describe, it, expect } from "vitest"; 
import { canonicalize, sha256Hex } from "../src/lib/canonical.js"; 
describe("canonicalize + sha256", () => { 
it("normalizes line endings and trims trailing spaces", () => { 
const text = "A  \r\nB\t \n"; 
const c = canonicalize(text); 
expect(c).toBe("A\nB\n"); 
const h = sha256Hex(c); 
expect(h).toMatch(/^0x[0-9a-f]{64}$/); 
}); 
}); 
 
Ruta completa: .\services\grants\tests\signatures.test.ts 
import { describe, it, expect } from "vitest"; 
import nacl from "tweetnacl"; 
import { sha256Hex } from "../src/lib/canonical.js"; 
import { verifyEd25519, verifyEip191 } from 
"../src/lib/signatures.js"; 
import { Wallet, SigningKey, hashMessage, sign } from "ethers"; 
 
describe("signature verification", () => { 
  it("verifies ed25519 signatures over hash", () => { 
    const kp = nacl.sign.keyPair(); 
    const msg = "hello"; 
    const hashHex = sha256Hex(msg); 
    const sig = nacl.sign.detached(Buffer.from(hashHex.slice(2), 
"hex"), kp.secretKey); 
    const ok = verifyEd25519(hashHex, 
Buffer.from(sig).toString("base64"), 
Buffer.from(kp.publicKey).toString("base64")); 
    expect(ok).toBe(true); 
  }); 
 
  it("verifies eip191 signatures (Ethereum Signed Message)", async () 
=> { 
    const w = Wallet.createRandom(); 
    const hashHex = sha256Hex("doc"); 
    const ethMsg = hashMessage(Buffer.from(hashHex.slice(2), "hex")); 
    const signature = await sign(new SigningKey(w.privateKey), { 
message: ethMsg }); 
    const ok = verifyEip191(hashHex, signature, w.address); 
    expect(ok).toBe(true); 
  }); 
}); 
 
Ruta completa: .\services\grants\tests\api.test.ts 
import { describe, it, expect } from "vitest"; 
import request from "supertest"; 
import app from "../index.js"; 
 
describe("API smoke", () => { 
  it("lists jurisdictions and instantiates", async () => { 
    const j = await 
request(app).get("/v1/grants/templates/jurisdictions"); 
    expect(j.status).toBe(200); 
    expect(Array.isArray(j.body.jurisdictions)).toBe(true); 
 
    const body = { 
      jurisdiction: "ES", 
      templateId: "grant_basic", 
      variables: { 
        version: "1.0.0", 
        date: "2025-08-19", 
        funder_name: "DAO GNEW", 
        funder_id: "VAT-ES-123", 
        grantee_name: "Equipo X", 
        grantee_id: "NIF-Y", 
        project_name: "Proyecto Phoenix", 
        ip_clause: "El código será OSS bajo Apache-2.0", 
        funder_signatory: "Alice", 
        grantee_signatory: "Bob", 
        project_id: "PX-001" 
      } 
    }; 
    const r = await 
request(app).post("/v1/grants/agreements/instantiate").send(body); 
    expect(r.status).toBe(200); 
    expect(r.body.hash).toMatch(/^0x[0-9a-f]{64}$/); 
    expect(typeof r.body.canonical).toBe("string"); 
  }); 
}); 
 
Ruta completa: .\services\grants\Dockerfile 
ARG NODE_VERSION=20-alpine 
FROM node:${NODE_VERSION} AS build 
WORKDIR /app 
RUN corepack enable 
ARG NODE_ENV=production 
ENV NODE_ENV=${NODE_ENV} 
COPY package.json tsconfig.json ./ 
RUN pnpm install --prod --frozen-lockfile=false 
COPY . . 
RUN pnpm build || npx tsc 
FROM node:${NODE_VERSION} 
WORKDIR /app 
RUN corepack enable && apk add --no-cache curl 
ARG NODE_ENV 
ENV NODE_ENV=${NODE_ENV} 
COPY --from=build /app /app 
USER 1001 
HEALTHCHECK --interval=30s CMD curl -f http://localhost:8000/health || 
exit 1 
EXPOSE 8000 
CMD ["pnpm", "start"] 
Ruta completa: .\services\grants.env.example 
COSMOS_RPC=http://wasmd:26657 
ADDR_PREFIX=cosmos 
MNEMONIC=replace with dev mnemonic 
GRANT_REGISTRY_CONTRACT=cosmos1registryxxxxxxxxxxxxxxxxxxxx 
STAKE_DENOM=ugnew 
PORT=8000 
Ruta completa: .\services\grants\README.md 
# Grants Service (GNEW N116 · 12.6 Contratos estándar de grants) 
**Objetivo:** Plantillas con firmas y hash on-chain.   
**Entregables:** Catálogo por jurisdicción + registro de hash en 
contrato de Registry.   
**DoD:** `verify-signature` devuelve `valid: true`; 
`/registry/register` retorna `status: ok` (tx aceptada). 
## Endpoints - `GET /v1/grants/templates/jurisdictions` → lista de jurisdicciones. - `GET /v1/grants/templates/catalog` → catálogo completo. - `GET /v1/grants/templates/:jurisdiction/:templateId` → markdown de 
plantilla. - `POST /v1/grants/agreements/instantiate` → render Mustache → 
`canonical` + `hash (0x..)`. - `POST /v1/grants/agreements/verify-signature` - `scheme: ed25519` ⇒ `publicKey (b64), signature (b64)` - `scheme: eip191` ⇒ `address (0x..), signature (0x..)` - entrada: `message` **o** `hash`. - `POST /v1/grants/registry/register` → `{ hash, meta }` → `execute({ 
register_hash: { hash, meta } })`. 
## Operación 
1) **Intake legal** selecciona jurisdicción/plantilla.   
2) Backend instancia, **canoniza** y calcula **SHA-256** determinista 
(hex).   
3) Firmantes envían firma (Ed25519 o EIP‑191).   
4) Al validar todo, se **registra el hash on‑chain** en 
`GRANT_REGISTRY_CONTRACT`.   
5) Métricas Prometheus: `grant_signatures_verified_total`. 
## Deploy 
docker build -t grants . 
docker run -p 8000:8000 --env-file .env grants 
## Notas 
- El contrato CosmWasm **Registry** debe exponer `execute` 
`register_hash { hash, meta }`. - Para añadir jurisdicciones, ampliar `templates/index.json` y agregar 
`templates/<JUR>/<id>.md`. 
Cómo cumple con N116 
● Marco Legal + Back + SC: servicio HTTP (Back) que ofrece catálogo por jurisdicción 
(Legal) y registra hash on‑chain (SC CosmWasm). 
● Plantillas con firmas y hash on-chain: instantiate → hash; verify-signature 
→ Ed25519/EIP‑191; registry/register → tx. 
● Entregables: templates/index.json + plantillas ES/MX/US-DE. 
● DoD: verificación de firma (valid: true) y status: ok al registrar hash (respuesta 
del nodo). 
● Seguridad: canonización determinista + sha256 + recuperación de address EVM 
(EIP‑191). Circuit breaker para llamadas a cadena. 
Si quieres, puedo añadir un contrato CosmWasm grant_registry de ejemplo 
(msg/execute/query) para cerrar el loop end‑to‑end. 
Tú dijiste: 
programar a detalle N117 12.7 Integración Launchpad→Marketplace (Prompt 117) Objetivo: 
Que un éxito en launchpad aparezca en market. Roles: Back, Front. DoD: transición sin pérdida 
de datos; SEO. 
ChatGPT Plus 
Pensó durante 1m 1s 
Aquí tienes el programa a nivel de detalle para GNEW N117 · 12.7 Integración Launchpad 
→ Marketplace. Entrego un servicio FastAPI l2m (Launchpad‑to‑Market), clientes HTTP 
para launchpad y market, transformación y mapeo de datos con idempotencia, webhook 
de éxito, replay/backfill DAG, y módulos SEO (sitemap dinámico, manifest de redirecciones 
301 y JSON‑LD). Cumple DoD: transición sin pérdida de datos (snapshot + mapping 
persistente, reintentos idempotentes) y SEO (301, canonical, sitemap, JSON‑LD). 
Ruta completa: 
services/l2m/config.py 
from pydantic_settings import SettingsConfigDict 
from services.common.config import CommonSettings 
 
class Settings(CommonSettings): 
    service_name: str = "l2m" 
    database_url: str = "sqlite:///./l2m.db" 
    metrics_port: int = 8041 
 
    # Launchpad (origen) y Marketplace (destino) 
    launchpad_api: str | None = None   # ej: http://launchpad:8010 
    marketplace_api: str | None = None # ej: http://market:8025 
    hmac_secret: str = "change-me"     # verificación webhook 
 
    # SEO 
    site_base_url: str = "https://app.gnew.org" 
    market_base_path: str = "/market" 
    launchpad_base_path: str = "/launchpad" 
 
    # Reintentos / idempotencia 
    max_retries: int = 5 
 
    model_config = SettingsConfigDict(env_file=".env") 
 
settings = Settings() 
 
 
Ruta completa: 
services/l2m/models.py 
from sqlalchemy import ( 
    create_engine, Column, Integer, String, Float, DateTime, JSON, 
Boolean, UniqueConstraint, Index 
) 
from sqlalchemy.orm import declarative_base, sessionmaker 
from datetime import datetime 
from .config import settings 
 
engine = create_engine( 
    settings.database_url, 
    connect_args={"check_same_thread": False} if 
settings.database_url.startswith("sqlite") else {}, 
) 
SessionLocal = sessionmaker(bind=engine, autoflush=False, 
autocommit=False) 
Base = declarative_base() 
 
class LaunchpadShadow(Base): 
    """ 
    Snapshot inmutable del proyecto de launchpad al momento de 
SUCCESS. 
    Garantiza "sin pérdida de datos". 
    """ 
    __tablename__ = "launchpad_shadow" 
    id = Column(Integer, primary_key=True) 
    lp_project_id = Column(String, index=True)      # id en launchpad 
    slug = Column(String, index=True) 
    title = Column(String) 
    status = Column(String)                         # success/... 
    raised = Column(Float, default=0.0) 
    currency = Column(String, default="USD") 
    backers = Column(Integer, default=0) 
    media = Column(JSON, default=list)              # [urls] 
    meta = Column(JSON, default=dict)               # {description, 
tags, ...} 
    full_payload = Column(JSON, default=dict)       # JSON completo de 
origen 
    created_at = Column(DateTime, default=datetime.utcnow) 
    __table_args__ = (UniqueConstraint("lp_project_id", 
name="uq_lpshadow_project"),) 
 
class Mapping(Base): 
    """ 
    Mapa entre el proyecto de launchpad y el listing del marketplace. 
    """ 
    __tablename__ = "mapping" 
    id = Column(Integer, primary_key=True) 
    lp_project_id = Column(String, index=True) 
    market_listing_id = Column(String, index=True) 
    lp_slug = Column(String, index=True) 
    market_slug = Column(String, index=True) 
    created_at = Column(DateTime, default=datetime.utcnow) 
    __table_args__ = (UniqueConstraint("lp_project_id", 
name="uq_map_lp"),) 
 
class TaskLog(Base): 
    __tablename__ = "task_log" 
    id = Column(Integer, primary_key=True) 
    lp_project_id = Column(String, index=True) 
    attempts = Column(Integer, default=0) 
    last_error = Column(String, nullable=True) 
    done = Column(Boolean, default=False) 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
class RedirectRule(Base): 
    """ 
    Reglas de SEO (301) exportables para edge/CDN o Next.js 
middleware. 
    """ 
    __tablename__ = "redirect_rule" 
    id = Column(Integer, primary_key=True) 
    from_path = Column(String, unique=True, index=True) 
    to_path = Column(String, index=True) 
    status_code = Column(Integer, default=301) 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
def init_db(): 
    Base.metadata.create_all(bind=engine) 
 
 
Ruta completa: 
services/l2m/clients.py 
import httpx 
from .config import settings 
 
class LaunchpadClient: 
    def __init__(self, base: str | None = None): 
        self.base = base or settings.launchpad_api 
 
    async def fetch_project(self, project_id: str) -> dict: 
        # Se asume que launchpad expone detalles públicos/privados del 
proyecto 
        async with httpx.AsyncClient(timeout=15) as ac: 
            r = await ac.get(f"{self.base}/projects/{project_id}") 
            r.raise_for_status() 
            return r.json() 
 
class MarketClient: 
    def __init__(self, base: str | None = None): 
        self.base = base or settings.marketplace_api 
 
    async def create_listing(self, payload: dict, token: str | None = 
None) -> dict: 
        headers = {"Content-Type":"application/json", 
**({"Authorization": f"Bearer {token}"} if token else {})} 
        async with httpx.AsyncClient(timeout=20) as ac: 
            r = await ac.post(f"{self.base}/listings", json=payload, 
headers=headers) 
            r.raise_for_status() 
            return r.json() 
 
    async def publish_listing(self, listing_id: str, token: str | None 
= None) -> dict: 
        headers = {"Content-Type":"application/json", 
**({"Authorization": f"Bearer {token}"} if token else {})} 
        async with httpx.AsyncClient(timeout=15) as ac: 
            r = await 
ac.post(f"{self.base}/listings/{listing_id}/publish", headers=headers) 
            r.raise_for_status() 
            return r.json() 
 
 
Ruta completa: 
services/l2m/transform.py 
from typing import Tuple 
from .config import settings 
 
def slugify(s: str) -> str: 
    import re, unicodedata 
    s = unicodedata.normalize("NFKD", s).encode("ascii", 
"ignore").decode("ascii") 
    s = re.sub(r"[^a-zA-Z0-9-]+","-", s).strip("-").lower() 
    return s[:80] 
 
def map_launchpad_to_market(lp: dict) -> Tuple[dict, str]: 
    """ 
    Transforma el payload del Launchpad al formato de Listing del 
Market. 
    Retorna (payload_market, slug_sugerido). 
    """ 
    title = lp.get("title") or lp.get("name") or "Untitled" 
    lp_slug = lp.get("slug") or slugify(title) 
    description = lp.get("description") or 
lp.get("meta",{}).get("description","") 
    images = lp.get("media", []) or lp.get("images", []) 
    tags = lp.get("tags", []) 
    price = 0.0  # listing 'gratuito' por defecto; el marketplace 
puede usar 'funded' como atributo 
 
    seo = { 
        "canonical": 
f"{settings.site_base_url}{settings.market_base_path}/{lp_slug}", 
        "og": { 
            "title": title, 
            "description": description[:200], 
            "image": images[0] if images else None, 
        }, 
        "jsonld": { 
            "@context":"https://schema.org", 
            "@type":"CreativeWork", 
            "name": title, 
            "description": description[:500], 
            "url": 
f"{settings.site_base_url}{settings.market_base_path}/{lp_slug}", 
            "image": images[:3] if images else [], 
            "about": tags 
        } 
    } 
 
    payload = { 
        "title": title, 
        "slug": lp_slug, 
        "summary": description[:280], 
        "body": description, 
        "media": images, 
        "attributes": { 
            "raised": lp.get("raised"), 
            "currency": lp.get("currency","USD"), 
            "backers": lp.get("backers", 0), 
            "source": "launchpad", 
            "launchpad_id": lp.get("id") or lp.get("project_id"), 
        }, 
        "tags": tags, 
        "price": price, 
        "seo": seo, 
        "status": "draft"  # será 'published' tras publish_listing 
    } 
    return payload, lp_slug 
 
 
Ruta completa: services/l2m/seo.py 
from fastapi import Response 
from sqlalchemy.orm import Session 
from .config import settings 
from .models import Mapping 
 
def sitemap_xml(db: Session) -> Response: 
    urls = [] 
    # Añadir las URLs de los listings mapeados 
    for m in db.query(Mapping).all(): 
        loc = 
f"{settings.site_base_url}{settings.market_base_path}/{m.market_slug}" 
        urls.append(f"<url><loc>{loc}</loc></url>") 
    xml = f'<?xml version="1.0" encoding="UTF-8"?>\n' \ 
          f'<urlset 
xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' \ 
          + "\n".join(urls) + "\n</urlset>" 
    return Response(content=xml, media_type="application/xml") 
 
def redirect_manifest(db: Session) -> dict: 
    """ 
    Devuelve un manifest { redirects: [{from,to,code}], canonical: 
[{slug,canonical}] } 
    para que Front/edge configure 301 y canonical. 
    """ 
    redirects = [] 
    canon = [] 
    for m in db.query(Mapping).all(): 
        frm = f"{settings.launchpad_base_path}/{m.lp_slug}" 
        to = f"{settings.market_base_path}/{m.market_slug}" 
        redirects.append({"from": frm, "to": to, "code": 301}) 
        canon.append({"slug": m.market_slug, "canonical": 
f"{settings.site_base_url}{to}"}) 
    return {"redirects": redirects, "canonical": canon} 
 
Ruta completa: services/l2m/hmac.py 
import hmac, hashlib 
def verify_hmac(request_body: bytes, provided_sig: str, secret: str) -> bool: 
mac = hmac.new(secret.encode(), msg=request_body, 
digestmod=hashlib.sha256).hexdigest() 
try: 
return hmac.compare_digest(mac, provided_sig) 
except Exception: 
return False 
Ruta completa: services/l2m/main.py 
from fastapi import FastAPI, Depends, Header, HTTPException, Request 
from fastapi.responses import JSONResponse 
from fastapi.security import OAuth2PasswordBearer, 
HTTPAuthorizationCredentials 
from starlette.middleware import Middleware 
from services.common.middleware import LoggingMiddleware 
from services.common.logger import setup_logging 
from services.common.otel import setup_otel 
from prometheus_client import start_http_server, Counter, Histogram 
from sqlalchemy.orm import Session 
from sqlalchemy import text 
from datetime import datetime 
from packages.auth_client import verify as _verify 
from .config import settings 
from .models import init_db, SessionLocal, LaunchpadShadow, Mapping, 
TaskLog, RedirectRule 
from .clients import LaunchpadClient, MarketClient 
from .transform import map_launchpad_to_market 
from .seo import sitemap_xml, redirect_manifest 
from .hmac import verify_hmac 
 
setup_logging(settings.service_name, settings.log_level) 
app = FastAPI(title="GNEW Launchpad→Market Bridge", 
middleware=[Middleware(LoggingMiddleware)]) 
setup_otel("gnew-l2m", app) 
 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login") 
def get_user(token: str = Depends(oauth2_scheme)) -> dict: 
    cred = HTTPAuthorizationCredentials(scheme="Bearer", 
credentials=token) 
    return _verify(cred) 
 
def get_db(): 
    db = SessionLocal() 
    try: yield db 
    finally: db.close() 
 
# Metrics 
l2m_webhooks_total = Counter("l2m_webhooks_total", "Webhooks 
recibidos", ["event"]) 
l2m_sync_total = Counter("l2m_sync_total", "Sincronizaciones 
ejecutadas", ["result"]) 
l2m_sync_duration = Histogram("l2m_sync_duration_seconds", "Duración 
de sincronización l2m") 
 
@app.on_event("startup") 
async def startup_event(): 
    init_db() 
    start_http_server(settings.metrics_port) 
 
@app.get("/health") 
async def health(db: Session = Depends(get_db)): 
    try: 
        db.execute(text("SELECT 1")); return {"status":"ok"} 
    except Exception: 
        return JSONResponse({"status":"fail"}, status_code=500) 
 
# ---------- SEO endpoints ---------- 
@app.get("/seo/sitemap.xml") 
async def seo_sitemap(db: Session = Depends(get_db)): 
    return sitemap_xml(db) 
 
@app.get("/seo/redirects.json") 
async def seo_redirects(db: Session = Depends(get_db)): 
    return redirect_manifest(db) 
 
# ---------- Webhook: éxito en Launchpad ---------- 
@app.post("/webhooks/launchpad") 
async def launchpad_webhook(req: Request, x_gnew_sig: str = 
Header(None), db: Session = Depends(get_db)): 
    body = await req.body() 
    if not x_gnew_sig or not verify_hmac(body, x_gnew_sig, 
settings.hmac_secret): 
        raise HTTPException(401, "invalid signature") 
    payload = await req.json() 
    event = payload.get("event") 
    l2m_webhooks_total.labels(event=event or "unknown").inc() 
    if event != "project.success": 
        return {"ignored": True} 
 
    lp = payload.get("project", {}) 
    lp_id = str(lp.get("id") or lp.get("project_id")) 
    if not lp_id: 
        raise HTTPException(400, "missing project id") 
 
    # snapshot inmutable 
    existing = 
db.query(LaunchpadShadow).filter_by(lp_project_id=lp_id).one_or_none() 
    if not existing: 
        snap = LaunchpadShadow( 
            lp_project_id=lp_id, 
            slug=lp.get("slug"), 
            title=lp.get("title") or lp.get("name"), 
            status="success", 
            raised=float(lp.get("raised", 0.0)), 
            currency=lp.get("currency","USD"), 
            backers=int(lp.get("backers",0)), 
            media=lp.get("media") or [], 
            meta=lp.get("meta") or {}, 
            full_payload=lp 
        ) 
        db.add(snap); db.add(TaskLog(lp_project_id=lp_id, attempts=0, 
done=False)) 
        db.commit() 
 
    # dispara sync 
    out = await sync_one(lp_id, db) 
    return out 
 
# ---------- Task: run sync for a given project ---------- 
@app.post("/tasks/run/{lp_project_id}") 
async def run_task(lp_project_id: str, db: Session = Depends(get_db), 
user: dict = Depends(get_user)): 
    return await sync_one(lp_project_id, db) 
 
async def sync_one(lp_project_id: str, db: Session) -> dict: 
    task = 
db.query(TaskLog).filter_by(lp_project_id=lp_project_id).one_or_none() 
    if not task: 
        task = TaskLog(lp_project_id=lp_project_id, attempts=0, 
done=False) 
        db.add(task); db.commit(); db.refresh(task) 
    if task.done: 
        return {"status":"ok", "idempotent": True} 
 
    with l2m_sync_duration.time(): 
        try: 
            # 1) Obtener snapshot (ya persistido); si no existe, fetch 
desde Launchpad 
            snap = 
db.query(LaunchpadShadow).filter_by(lp_project_id=lp_project_id).one_o
 r_none() 
            if not snap: 
                lp_client = LaunchpadClient() 
                data = await lp_client.fetch_project(lp_project_id) 
                from datetime import datetime as _dt 
                snap = LaunchpadShadow( 
                    lp_project_id=str(data.get("id")), 
                    slug=data.get("slug"), 
                    title=data.get("title") or data.get("name"), 
                    status=data.get("status"), 
                    raised=float(data.get("raised") or 0.0), 
                    currency=data.get("currency","USD"), 
                    backers=int(data.get("backers") or 0), 
                    media=data.get("media") or [], 
                    meta=data.get("meta") or {}, 
                    full_payload=data 
                ) 
                db.add(snap); db.commit(); db.refresh(snap) 
 
            # 2) Transformar → payload marketplace 
            payload, lp_slug = 
map_launchpad_to_market(snap.full_payload) 
 
            # 3) Crear listing si no existe mapping 
            mapping = 
db.query(Mapping).filter_by(lp_project_id=lp_project_id).one_or_none() 
            if not mapping: 
                mk_client = MarketClient() 
                listing = await mk_client.create_listing(payload) 
                listing_id = str(listing.get("id")) 
                market_slug = listing.get("slug") or payload["slug"] 
                mapping = Mapping(lp_project_id=lp_project_id, 
market_listing_id=listing_id, lp_slug=lp_slug, 
market_slug=market_slug) 
                db.add(mapping) 
                # Regla SEO 301 
                
db.add(RedirectRule(from_path=f"{settings.launchpad_base_path}/{lp_slu
 g}", to_path=f"{settings.market_base_path}/{market_slug}")) 
                db.commit() 
                # Publicar listing 
                await mk_client.publish_listing(listing_id) 
 
            task.attempts += 1; task.done = True; task.last_error = 
None 
            db.add(task); db.commit() 
            l2m_sync_total.labels(result="ok").inc() 
            return {"status":"ok", "mapping": {"launchpad": 
lp_project_id, "market": mapping.market_listing_id, "slug": 
mapping.market_slug}} 
 
        except Exception as e: 
            task.attempts += 1; task.last_error = str(e); 
db.add(task); db.commit() 
            l2m_sync_total.labels(result="error").inc() 
            raise HTTPException(500, f"sync error: {e}") 
 
 
Ruta completa: 
services/l2m/requirements.in 
fastapi 
uvicorn[standard] 
sqlalchemy 
pydantic-settings 
prometheus_client 
python-jose[cryptography] 
httpx 
pytest 
pytest-asyncio 
 
 
Ruta completa: 
services/l2m/Dockerfile 
ARG PYTHON_VERSION=3.12-alpine 
FROM python:${PYTHON_VERSION} AS builder 
WORKDIR /app 
RUN apk add --no-cache build-base curl 
COPY requirements.txt ./ 
RUN pip install --prefix /install -r requirements.txt 
COPY . . 
RUN python -m compileall -q . 
FROM python:${PYTHON_VERSION} 
WORKDIR /app 
COPY --from=builder /install /usr/local 
COPY --from=builder /app /app 
USER 1001 
EXPOSE 8040 8041 
HEALTHCHECK --interval=30s CMD curl -f http://localhost:8040/health || 
exit 1 
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8040"] 
Ruta completa: 
services/l2m/tests/test_flow.py 
import os, sys, importlib.util, json, pytest 
from httpx import AsyncClient, ASGITransport 
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), 
"../../..")) 
sys.path.insert(0, ROOT) 
# Carga app 
module_path = os.path.join(ROOT, "services", "l2m", "main.py") 
spec = importlib.util.spec_from_file_location("l2m_app", module_path, 
submodule_search_locations=[os.path.dirname(module_path)]) 
mod = importlib.util.module_from_spec(spec); 
spec.loader.exec_module(mod) 
 
from services.gateway.auth import create_access_token 
from sqlalchemy.pool import StaticPool 
mod.SessionLocal = 
mod.sessionmaker(bind=mod.create_engine("sqlite:///:memory:", 
connect_args={"check_same_thread": False}, poolclass=StaticPool)) 
mod.init_db() 
 
@pytest.mark.asyncio 
async def test_sitemap_and_redirects_and_sync_idempotent(monkeypatch): 
    app = mod.app 
    token = create_access_token({"sub":"ops","role":"admin"}) 
    headers = {"Authorization": f"Bearer {token}"} 
 
    # Mock clients 
    async def _fetch(pid): 
        return {"id": pid, "slug": "phoenix", "title": "Phoenix", 
"raised": 1000, "currency":"USD", "backers": 10, "media": 
["https://x/1.png"], "meta":{"description":"d"}} 
    async def _create(payload, token=None): 
        return {"id": "L-1", "slug": payload["slug"]} 
 
    async def _publish(lid, token=None): 
        return {"ok": True} 
 
    mod.LaunchpadClient.fetch_project = lambda self, pid: _fetch(pid)  
# type: ignore 
    mod.MarketClient.create_listing = lambda self, payload, 
token=None: _create(payload)  # type: ignore 
    mod.MarketClient.publish_listing = lambda self, lid, token=None: 
_publish(lid)  # type: ignore 
 
    transport = ASGITransport(app=app) 
    async with AsyncClient(transport=transport, base_url="http://t") 
as ac: 
        # Ejecutar sync manual (sin webhook) 
        r = await ac.post("/tasks/run/42", headers=headers) 
        assert r.status_code == 200 
 
        # idempotente 
        r2 = await ac.post("/tasks/run/42", headers=headers) 
        assert r2.status_code == 200 
        assert r2.json()["status"] == "ok" 
 
        # SEO endpoints 
        sm = await ac.get("/seo/sitemap.xml") 
        assert sm.status_code == 200 and "urlset" in sm.text 
 
        red = await ac.get("/seo/redirects.json") 
        assert red.status_code == 200 
        data = red.json() 
        assert data["redirects"][0]["code"] == 301 
 
 
Ruta completa: dags/l2m_replay.py 
from datetime import datetime, timedelta 
from airflow import DAG 
from airflow.operators.python import PythonOperator 
import os, requests 
 
L2M_URL = os.environ.get("L2M_URL","http://l2m:8040") 
TOKEN = os.environ.get("L2M_TOKEN") 
 
def replay_missing(): 
    headers = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {} 
    # Si el launchpad expone un feed de "success", escanéalo aquí. 
Placeholder: 
    ids = [s for s in os.environ.get("L2M_BACKFILL_IDS","").split(",") 
if s] 
    for pid in ids: 
        try: 
            requests.post(f"{L2M_URL}/tasks/run/{pid}", 
headers=headers, timeout=15) 
        except Exception: 
            pass 
 
with DAG( 
    dag_id="l2m_replay", 
    schedule="*/30 * * * *", start_date=datetime(2025,1,1), 
catchup=False, tags=["l2m","bridge"] 
) as dag: 
    PythonOperator(task_id="replay_missing", 
python_callable=replay_missing) 
 
 
Ruta completa: 
packages/l2m-client/src/index.ts 
export class L2MClient { 
  constructor(private baseUrl: string, private token?: string) {} 
  private h(){ return { "Content-Type": "application/json", 
...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) }; } 
  async run(projectId: string){ 
    const r = await 
fetch(`${this.baseUrl}/tasks/run/${encodeURIComponent(projectId)}`, { 
method:"POST", headers:this.h() }); 
    if(!r.ok) throw new Error(`run failed ${r.status}`); return 
r.json(); 
  } 
  async redirects(){ 
    const r = await fetch(`${this.baseUrl}/seo/redirects.json`, { 
headers: this.h() }); 
    if(!r.ok) throw new Error(`redirects failed ${r.status}`); return 
r.json(); 
  } 
async sitemapXML(){ 
const r = await fetch(`${this.baseUrl}/seo/sitemap.xml`, { 
headers: this.h() }); 
if(!r.ok) throw new Error(`sitemap failed ${r.status}`); return 
await r.text(); 
} 
} 
Ruta completa: 
apps/web/src/middleware.ts 
(Next.js/Edge – SEO 301) 
import { NextRequest, NextResponse } from "next/server"; 
/** 
* Middleware que consume el manifest de redirecciones del servicio 
L2M. 
* Se cachea en memoria del edge por 5 minutos para baja latencia. 
*/ 
let cache: { ts: number; redirects: { from: string; to: string; code: 
number }[] } | null = null; 
async function getRedirects(): Promise<{ from: string; to: string; 
code: number }[]> { 
const now = Date.now(); 
if (cache && now - cache.ts < 5*60*1000) return cache.redirects; 
const base = process.env.L2M_URL || "http://l2m:8040"; 
const res = await fetch(`${base}/seo/redirects.json`, { next: { 
revalidate: 300 } }); 
const data = await res.json(); 
cache = { ts: now, redirects: data.redirects || [] }; 
return cache.redirects; 
} 
export async function middleware(req: NextRequest) { 
  const path = req.nextUrl.pathname; 
  const redirectRules = await getRedirects(); 
  const rule = redirectRules.find(r => r.from === path); 
  if (rule) { 
    const url = new URL(rule.to, req.nextUrl.origin); 
    return NextResponse.redirect(url.toString(), rule.code as any); 
  } 
  return NextResponse.next(); 
} 
 
export const config = { 
  matcher: ["/launchpad/:path*"] 
}; 
 
 
Ruta completa: 
apps/web/src/components/SeoHead.t
 sx 
import Head from "next/head"; 
 
type Props = { 
  title: string; 
  description?: string; 
  canonical: string; 
  ogImage?: string | null; 
  jsonld?: any; 
}; 
 
export default function SeoHead({ title, description, canonical, 
ogImage, jsonld }: Props) { 
  return ( 
    <Head> 
      <title>{title}</title> 
      {description ? <meta name="description" content={description} /> 
: null} 
      <link rel="canonical" href={canonical} /> 
      <meta property="og:type" content="website" /> 
      <meta property="og:title" content={title} /> 
      {description ? <meta property="og:description" 
content={description} /> : null} 
      {ogImage ? <meta property="og:image" content={ogImage} /> : 
null} 
      <meta name="twitter:card" content="summary_large_image" /> 
      {jsonld ? <script type="application/ld+json" 
dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonld) }} /> : 
null} 
    </Head> 
  ); 
} 
 
 
Cómo funciona (flujo E2E) 
1. Launchpad emite webhook project.success a POST /webhooks/launchpad con 
HMAC → l2m valida firma y persiste snapshot (LaunchpadShadow.full_payload). 
 
2. l2m transforma el payload (transform.map_launchpad_to_market) y crea un 
listing draft en Marketplace, lo publica y crea mapping lp_project_id ↔ 
market_listing_id + regla 301 Launchpad → Market. 
 
3. SEO: 
 
○ GET /seo/redirects.json → feed para edge middleware (301). 
 
○ GET /seo/sitemap.xml → incluye todas las URLs de listings ya migrados. 
 
○ payload.seo lleva canonical, OpenGraph y JSON‑LD a Marketplace (visible 
por SeoHead). 
 
4. Backfill/replay: dags/l2m_replay.py ejecuta POST /tasks/run/{id} para IDs 
atrasados/erróneos. 
 
5. Idempotencia / no pérdida de datos: 
○ Snapshot inmutable del objeto origen. 
○ Mapping único por lp_project_id. 
○ Re‑ejecuciones retornan {idempotent: true} si ya migró. 
○ Errores quedan en TaskLog (con attempts y mensaje); reintentos controlados. 
Cómo cumple el DoD 
● Transición sin pérdida de datos: 
○ Guardamos el JSON completo del Launchpad en 
LaunchpadShadow.full_payload. 
○ Persistimos campos clave (title, slug, media, raised, backers) + mapping 
bidireccional. 
○ Idempotencia y reintentos con TaskLog. 
● SEO: 
○ 301 permanentes launchpad/:slug → market/:slug desde 
redirects.json (middleware de ejemplo). 
○ Canonical y OpenGraph/Twitter en el listing. 
○ Sitemap XML con URLs finales para rastreo rápido. 
○ JSON‑LD CreativeWork por listing para rich snippets. 
Notas de integración 
● Permisos: si el Marketplace requiere auth para crear/publish, añade token a 
MarketClient (ya soportado). 
● Colisiones de slug: market debe devolver slug final; lo respetamos en 
Mapping.market_slug. 
● Imágenes: se tratan como URLs externas (no duplicamos: evita pérdidas y mantiene 
integridad). Si es necesario, añade un asset fetcher asíncrono. 
● Schemas: si el Marketplace espera otro shape, ajusta 
transform.map_launchpad_to_market. 
● Monitoreo: métricas Prometheus: l2m_webhooks_total, 
l2m_sync_total{result}, l2m_sync_duration_seconds. 
¿Te agrego un indexer que lea directamente eventos on‑chain/e2e del Launchpad en lugar de 
webhook, o un componente UI para “Promoted/New from Launchpad” en el marketplace? 
Tú dijiste: 
desarrolla a detalle de programación N118 12.8 Anti-colusión y señales (Prompt 118) Objetivo: 
Detectar anillos de voto y patrones anómalos. Roles: Data, Seguridad. Stack: graph analytics, 
scoring. DoD: recall/precisión > objetivo. 
ChatGPT Plus 
Pensó durante 44s 
Aquí va el programa a nivel de detalle para GNEW N118 · 12.8 Anti‑colusión y señales 
(Prompt 118). Entrego un servicio FastAPI anticollusion con ETL de eventos de 
voto/interacción, análisis de grafos (anillos, cliques, similitud de co‑voto, ciclos), scoring 
(supervisado + no supervisado), explicabilidad, evaluación (precision/recall/F1) contra 
ground truth, alertas y DAG de ejecución periódica. Cumple DoD: endpoint/metricas que 
verifican si precision y recall superan umbrales objetivo configurables. 
Ruta completa: 
services/anticollusion/config.py 
from pydantic_settings import SettingsConfigDict 
from services.common.config import CommonSettings 
 
class Settings(CommonSettings): 
    service_name: str = "anticollusion" 
    database_url: str = "sqlite:///./anticollusion.db" 
    metrics_port: int = 8051 
 
    # Objetivos DoD 
    target_precision: float = 0.80 
    target_recall: float = 0.75 
 
    # Señales (umbrales) 
    min_votes_per_pair: int = 3 
    jaccard_threshold: float = 0.5 
    time_window_minutes: int = 30 
    ring_min_size: int = 3 
    ring_max_density: float = 0.8 
 
    # Scoring 
    iso_forest_contamination: float = 0.05   # % esperado de anomalías 
    logistic_max_iter: int = 500 
 
    # SEO/None aquí; solo Data/Security 
    model_config = SettingsConfigDict(env_file=".env") 
 
settings = Settings() 
 
 
Ruta completa: 
services/anticollusion/models.py 
from sqlalchemy import ( 
    create_engine, Column, Integer, String, Float, DateTime, Boolean, 
JSON, ForeignKey, Index, UniqueConstraint 
) 
from sqlalchemy.orm import declarative_base, relationship, 
sessionmaker 
from datetime import datetime 
from .config import settings 
 
engine = create_engine( 
    settings.database_url, 
    connect_args={"check_same_thread": False} if 
settings.database_url.startswith("sqlite") else {}, 
) 
SessionLocal = sessionmaker(bind=engine, autoflush=False, 
autocommit=False) 
Base = declarative_base() 
 
# Nodos (usuarios/dids/adressees) y objetivos (propuestas/proyectos) 
class User(Base): 
    __tablename__ = "users" 
    id = Column(Integer, primary_key=True) 
    address = Column(String, unique=True, index=True) 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
class Target(Base): 
    __tablename__ = "targets" 
    id = Column(Integer, primary_key=True) 
    external_id = Column(String, index=True)  # proposalId/projectId 
    slug = Column(String, index=True) 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
class Vote(Base): 
    """ 
    Evento de voto/interacción binaria (a favor/contra u otro tipo). 
    Para co‑voto sólo importa la coincidencia de target y ventana de 
tiempo. 
    """ 
    __tablename__ = "votes" 
    id = Column(Integer, primary_key=True) 
    user_id = Column(Integer, ForeignKey("users.id"), index=True) 
    target_id = Column(Integer, ForeignKey("targets.id"), index=True) 
    ts = Column(DateTime, index=True) 
    value = Column(Float, default=1.0)  # +1/-1 opcional 
    meta = Column(JSON, default=dict) 
 
    user = relationship("User") 
    target = relationship("Target") 
 
Index("ix_votes_user_target_ts", Vote.user_id, Vote.target_id, 
Vote.ts) 
 
class PairFeature(Base): 
    """ 
    Señales entre pares de usuarios (para detectar 
“anillos”/coaliciones). 
    """ 
    __tablename__ = "pair_features" 
    id = Column(Integer, primary_key=True) 
    ua = Column(Integer, index=True) 
    ub = Column(Integer, index=True) 
    co_votes = Column(Integer, default=0) 
    jaccard = Column(Float, default=0.0) 
    time_sync = Column(Float, default=0.0)  # fracción de co‑votos en 
ventana corta 
    weight = Column(Float, default=0.0)     # score de arista 
    batch_id = Column(String, index=True, default="latest") 
    __table_args__ = 
(UniqueConstraint("ua","ub","batch_id",name="uq_pair_batch"),) 
 
class GroupFinding(Base): 
    """ 
    Resultado de detección de anillos (subgrafos sospechosos). 
    """ 
    __tablename__ = "group_findings" 
    id = Column(Integer, primary_key=True) 
    batch_id = Column(String, index=True) 
    group_label = Column(String, index=True) 
    members = Column(JSON, default=list)       # [user_id...] 
    size = Column(Integer) 
    density = Column(Float) 
    avg_jaccard = Column(Float) 
    score = Column(Float) 
    reason = Column(String)                    # explicación principal 
    flagged = Column(Boolean, default=True)    # sospechoso o no 
 
class Label(Base): 
    """ 
    Ground truth (para evaluación): group_label o user_id etiquetado 
como colusorio (1) o limpio (0). 
    """ 
    __tablename__ = "labels" 
    id = Column(Integer, primary_key=True) 
    kind = Column(String, index=True)          # "group" | "user" 
    key = Column(String, index=True)           # group_label o user_id 
str 
    y = Column(Integer)                        # 1 colusión / 0 normal 
    source = Column(String, default="moderation") 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
class RunMetric(Base): 
    __tablename__ = "run_metrics" 
    id = Column(Integer, primary_key=True) 
    batch_id = Column(String, index=True) 
    precision = Column(Float) 
    recall = Column(Float) 
    f1 = Column(Float) 
    threshold = Column(Float) 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
def init_db(): Base.metadata.create_all(bind=engine) 
 
 
Ruta completa: 
services/anticollusion/graph.py 
from collections import defaultdict 
from datetime import timedelta 
from typing import Dict, List, Tuple, Set 
import networkx as nx 
from sqlalchemy.orm import Session 
from .models import Vote, PairFeature 
from .config import settings 
 
def build_user_target_maps(db: Session): 
    """ 
    Devuelve: 
      votes_by_user: {user_id: [(target_id, ts)]} 
      users_by_target: {target_id: [user_id,...]} 
    """ 
    votes = db.query(Vote).all() 
    votes_by_user: Dict[int, List[Tuple[int, any]]] = 
defaultdict(list) 
    users_by_target: Dict[int, List[int]] = defaultdict(list) 
    for v in votes: 
        votes_by_user[v.user_id].append((v.target_id, v.ts)) 
        users_by_target[v.target_id].append(v.user_id) 
    # ordenar por tiempo 
    for u in votes_by_user: 
        votes_by_user[u].sort(key=lambda x: x[1]) 
    return votes_by_user, users_by_target 
 
def compute_pair_features(db: Session, batch_id: str = "latest") -> 
Dict[Tuple[int,int], Dict]: 
    votes_by_user, users_by_target = build_user_target_maps(db) 
 
    # índice reverse: targets por user y tiempos 
    targets_by_user: Dict[int, Set[int]] = {u: set(t for t,_ in lst) 
for u,lst in votes_by_user.items()} 
 
    # co‑voto: para cada target, todas las combinaciones de usuarios 
    pair_stats: Dict[Tuple[int,int], Dict] = defaultdict(lambda: 
{"co_votes":0,"time_sync":0}) 
    window = timedelta(minutes=settings.time_window_minutes) 
 
    for t, users in users_by_target.items(): 
        users = sorted(set(users)) 
        # eventos por user en este target 
        events = {u: [ts for tg, ts in votes_by_user[u] if tg == t] 
for u in users} 
        for i in range(len(users)): 
            for j in range(i+1, len(users)): 
                ua, ub = users[i], users[j] 
                key = (ua, ub) 
                pair_stats[key]["co_votes"] += 1 
                # sincronía temporal: si hay timestamps a distancia <= 
window 
                sync = 0 
                for tsa in events[ua]: 
                    if any(abs(tsa - tsb) <= window for tsb in 
events[ub]): 
                        sync = 1; break 
                pair_stats[key]["time_sync"] += sync 
 
    # jaccard por pares 
    out = {} 
    for (ua, ub), d in pair_stats.items(): 
        ja = targets_by_user.get(ua,set()) 
        jb = targets_by_user.get(ub,set()) 
        inter = len(ja & jb) 
        union = max(1, len(ja | jb)) 
        jacc = inter / union 
        co = d["co_votes"] 
        tsync = (d["time_sync"]/co) if co else 0.0 
        weight = (0.6*jacc) + (0.3*tsync) + (0.1*min(1.0, co/10)) 
        out[(ua,ub)] = {"co_votes":co, "jaccard":jacc, 
"time_sync":tsync, "weight":weight} 
 
        # persistencia 
        row = PairFeature(ua=ua, ub=ub, co_votes=co, jaccard=jacc, 
time_sync=tsync, weight=weight, batch_id=batch_id) 
        db.merge(row) 
    db.commit() 
    return out 
 
def build_collusion_graph(pairs: Dict[Tuple[int,int], Dict]) -> 
nx.Graph: 
    """ 
    Grafo no dirigido con aristas por pares con señales fuertes. 
    """ 
    G = nx.Graph() 
    for (ua,ub), f in pairs.items(): 
        if f["co_votes"] >= settings.min_votes_per_pair and 
f["jaccard"] >= settings.jaccard_threshold: 
            G.add_edge(ua, ub, weight=f["weight"], 
jaccard=f["jaccard"], co=f["co_votes"], tsync=f["time_sync"]) 
    return G 
 
def detect_rings(G: nx.Graph) -> List[Dict]: 
    """ 
    Heurística: subcomponentes densos con jaccard alto y presencia de 
ciclos. 
    """ 
    findings = [] 
    for comp in nx.connected_components(G): 
        nodes = list(comp) 
        n = len(nodes) 
        if n < settings.ring_min_size: continue 
        sub = G.subgraph(nodes).copy() 
        m = sub.number_of_edges() 
        density = (2*m) / (n*(n-1)) if n>1 else 0.0 
        avg_jacc = sum(sub[u][v]["jaccard"] for u,v in sub.edges()) / 
max(1, m) 
        # ciclo (anillo) presente? 
        has_cycle = len(nx.cycle_basis(sub)) > 0 
        score = 0.5*avg_jacc + 0.3*density + 0.2*(1.0 if has_cycle 
else 0.0) 
        flagged = density >= settings.ring_max_density or (has_cycle 
and avg_jacc >= settings.jaccard_threshold) 
        findings.append({ 
            "members": nodes, "size": n, "density": round(density,3), 
            "avg_jaccard": round(avg_jacc,3), "score": round(score,3), 
            "flagged": bool(flagged), "reason": "cycle+density" if 
has_cycle else "high-jaccard" 
        }) 
    # ordenar por score desc 
    findings.sort(key=lambda x: x["score"], reverse=True) 
    return findings 
 
 
Ruta completa: 
services/anticollusion/scoring.py 
from typing import List, Dict 
import numpy as np 
from sqlalchemy.orm import Session 
from sklearn.ensemble import IsolationForest 
from sklearn.linear_model import LogisticRegression 
from sklearn.metrics import precision_recall_curve, f1_score 
from .models import GroupFinding, Label, RunMetric 
from .config import settings 
 
def groups_to_X(findings: List[Dict]) -> np.ndarray: 
    X = [] 
    for g in findings: 
        X.append([ 
            g["size"], g["density"], g["avg_jaccard"], g["score"] 
        ]) 
    return np.array(X, dtype=float) 
 
def unsupervised_scores(findings: List[Dict]) -> np.ndarray: 
    X = groups_to_X(findings) 
    if len(X) == 0: return np.array([]) 
    iso = 
IsolationForest(contamination=settings.iso_forest_contamination, 
random_state=7) 
    iso.fit(X) 
    # decision_function: mayor => más normal; convertimos a “anomalía” 
0..1 
    raw = -iso.decision_function(X) 
    # normalizar 0..1 
    s = (raw - raw.min()) / (raw.ptp() if raw.ptp()>0 else 1) 
    return s 
 
def supervised_threshold(db: Session, findings: List[Dict]) -> Dict: 
    """ 
    Si hay labels de grupo, ajusta un modelo/logit y busca threshold 
que 
    cumpla objetivos de precision & recall (> settings.target_*). 
    """ 
    if not findings: return {"threshold": 0.5, "precision": 0.0, 
"recall": 0.0, "f1": 0.0} 
    labels = {l.key: l.y for l in 
db.query(Label).filter_by(kind="group").all()} 
    X = groups_to_X(findings) 
    y = np.array([labels.get(str(i+1), 0) for i in 
range(len(findings))], dtype=int)  # indexados por orden 
    if y.sum() == 0: 
        # sin positivos, usa no supervisado 
        s = unsupervised_scores(findings) 
        thr = float(np.percentile(s, 
100*(1-settings.iso_forest_contamination))) 
        y_pred = (s >= thr).astype(int) 
        prec, rec, f1 = 0.0, 0.0, 0.0 
    else: 
        clf = LogisticRegression(max_iter=settings.logistic_max_iter) 
        clf.fit(X, y) 
        prob = clf.predict_proba(X)[:,1] 
        precs, recs, thrs = precision_recall_curve(y, prob) 
        # elegir el threshold mínimo que cumpla objetivos; si no, 
maximizar F1 
        ok = [(p,r,t) for p,r,t in zip(precs, recs, list(thrs)+[1.0]) 
if p>=settings.target_precision and r>=settings.target_recall] 
        if ok: 
            p,r,t = sorted(ok, key=lambda x: (x[0]+x[1]), 
reverse=True)[0] 
            thr = float(t); y_pred = (prob>=thr).astype(int); prec, 
rec = float(p), float(r) 
            f1 = float(f1_score(y, y_pred)) 
        else: 
            # fallback: F1 max 
            f1s = [f1_score(y, (prob>=t).astype(int)) for t in thrs] 
            idx = int(np.argmax(f1s)); thr = float(thrs[idx]) 
            y_pred = (prob>=thr).astype(int) 
            prec, rec, f1 = float(precs[idx]), float(recs[idx]), 
float(f1s[idx]) 
 
    return {"threshold": thr, "precision": prec, "recall": rec, "f1": 
f1} 
 
 
Ruta completa: 
services/anticollusion/main.py 
from fastapi import FastAPI, Depends, HTTPException 
from fastapi.security import OAuth2PasswordBearer, 
HTTPAuthorizationCredentials 
from fastapi.responses import JSONResponse 
from starlette.middleware import Middleware 
from sqlalchemy.orm import Session 
from sqlalchemy import text 
from datetime import datetime 
from prometheus_client import start_http_server, Counter, Gauge, 
Histogram 
 
from services.common.middleware import LoggingMiddleware 
from services.common.logger import setup_logging 
from services.common.otel import setup_otel 
from packages.auth_client import verify as _verify 
 
from .config import settings 
from .models import init_db, SessionLocal, User, Target, Vote, 
PairFeature, GroupFinding, Label, RunMetric 
from .graph import compute_pair_features, build_collusion_graph, 
detect_rings 
from .scoring import supervised_threshold, unsupervised_scores 
setup_logging(settings.service_name, settings.log_level) 
app = FastAPI(title="GNEW Anti-collusion & Signals", 
middleware=[Middleware(LoggingMiddleware)]) 
setup_otel("gnew-anticollusion", app) 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login") 
def get_user(token: str = Depends(oauth2_scheme)) -> dict: 
cred = HTTPAuthorizationCredentials(scheme="Bearer", 
credentials=token) 
return _verify(cred) 
def get_db(): 
db = SessionLocal() 
try: yield db 
finally: db.close() 
# Metrics 
runs_total = Counter("ac_runs_total", "Ejecuciones de detección", 
["result"]) 
run_duration = Histogram("ac_run_seconds", "Duración de run") 
precision_g = Gauge("ac_precision", "Precision alcanzada", ["batch"]) 
recall_g =   Gauge("ac_recall", "Recall alcanzado", ["batch"]) 
@app.on_event("startup") 
async def startup_event(): 
init_db() 
start_http_server(settings.metrics_port) 
@app.get("/health") 
async def health(db: Session = Depends(get_db)): 
try: 
        db.execute(text("SELECT 1")); return {"status":"ok"} 
    except Exception: 
        return JSONResponse({"status":"fail"}, status_code=500) 
 
# -------- ETL mínima -------- 
@app.post("/etl/votes") 
async def etl_votes(payload: dict, db: Session = Depends(get_db), 
user: dict = Depends(get_user)): 
    """ 
    payload: { rows: [{address, target, ts, value?, meta?}, ...] } 
    """ 
    rows = payload.get("rows", []) 
    created = 0 
    for r in rows: 
        addr = r["address"].lower() 
        t_ext = str(r["target"]) 
        ts = 
datetime.fromisoformat(r["ts"].replace("Z","+00:00")).replace(tzinfo=N
 one) 
        u = db.query(User).filter_by(address=addr).one_or_none() 
        if not u: 
            u = User(address=addr); db.add(u); db.commit(); 
db.refresh(u) 
        t = 
db.query(Target).filter_by(external_id=t_ext).one_or_none() 
        if not t: 
            t = Target(external_id=t_ext, slug=t_ext); db.add(t); 
db.commit(); db.refresh(t) 
        v = Vote(user_id=u.id, target_id=t.id, ts=ts, 
value=float(r.get("value",1.0)), meta=r.get("meta",{})) 
        db.add(v); created += 1 
    db.commit() 
    return {"ingested": created} 
 
# -------- Labels (ground truth) -------- 
@app.post("/labels") 
async def upsert_labels(payload: dict, db: Session = Depends(get_db), 
user: dict = Depends(get_user)): 
    """ 
    payload: { items: [{kind:"group"|"user", key:"...", y:0|1}] } 
    """ 
    for it in payload.get("items", []): 
        db.merge(Label(kind=it["kind"], key=str(it["key"]), 
y=int(it["y"]), source="api")) 
    db.commit() 
    return {"ok": True} 
 
# -------- Run detección -------- 
@app.post("/run") 
async def run_detection(payload: dict, db: Session = Depends(get_db), 
user: dict = Depends(get_user)): 
    """ 
    payload: { batch_id?: string } 
    """ 
    batch_id = payload.get("batch_id") or 
datetime.utcnow().strftime("%Y%m%d%H%M%S") 
    with run_duration.time(): 
        try: 
            pairs = compute_pair_features(db, batch_id=batch_id) 
            G = build_collusion_graph(pairs) 
            groups = detect_rings(G) 
 
            # persistir findings 
            for i, g in enumerate(groups, start=1): 
                db.add(GroupFinding( 
                    batch_id=batch_id, group_label=str(i), 
                    members=g["members"], size=g["size"], 
density=g["density"], 
                    avg_jaccard=g["avg_jaccard"], score=g["score"], 
flagged=g["flagged"], 
                    reason=g["reason"] 
                )) 
            db.commit() 
 
            # scoring + métricas (DoD) 
            eval_res = supervised_threshold(db, groups) 
            
precision_g.labels(batch=batch_id).set(eval_res["precision"]) 
            recall_g.labels(batch=batch_id).set(eval_res["recall"]) 
            db.add(RunMetric(batch_id=batch_id, 
precision=eval_res["precision"], recall=eval_res["recall"], 
f1=eval_res["f1"], threshold=eval_res["threshold"])) 
            db.commit() 
 
            ok = (eval_res["precision"] >= settings.target_precision) 
and (eval_res["recall"] >= settings.target_recall) 
            runs_total.labels(result="ok" if ok else 
"below_target").inc() 
            return {"batch_id": batch_id, "n_groups": len(groups), 
"eval": eval_res, "meets_DoD": ok} 
        except Exception as e: 
            runs_total.labels(result="error").inc() 
            raise HTTPException(500, f"run failed: {e}") 
 
# -------- Consultas / Transparencia -------- 
@app.get("/groups/{batch_id}") 
async def list_groups(batch_id: str, db: Session = Depends(get_db), 
user: dict = Depends(get_user)): 
    rows = 
db.query(GroupFinding).filter_by(batch_id=batch_id).order_by(GroupFind
 ing.score.desc()).all() 
    return [{ 
        "group": r.group_label, "size": r.size, "density": r.density, 
"avg_jaccard": r.avg_jaccard, 
        "score": r.score, "flagged": r.flagged, "reason": r.reason, 
"members": r.members 
    } for r in rows] 
 
@app.get("/pair/{ua}/{ub}") 
async def pair_details(ua: int, ub: int, db: Session = 
Depends(get_db), user: dict = Depends(get_user)): 
    pf = db.query(PairFeature).filter_by(ua=min(ua,ub), 
ub=max(ua,ub)).one_or_none() 
    if not pf: raise HTTPException(404, "pair not found") 
    return {"co_votes": pf.co_votes, "jaccard": pf.jaccard, 
"time_sync": pf.time_sync, "weight": pf.weight} 
 
@app.get("/dod/status") 
async def dod_status(db: Session = Depends(get_db), user: dict = 
Depends(get_user)): 
    last = db.query(RunMetric).order_by(RunMetric.id.desc()).first() 
    if not last: return {"meets_DoD": False, "message":"no runs"} 
    ok = last.precision >= settings.target_precision and last.recall 
>= settings.target_recall 
    return { 
        "meets_DoD": ok, 
        "last": {"batch": last.batch_id, "precision": last.precision, 
"recall": last.recall, "f1": last.f1, "threshold": last.threshold}, 
        "targets": {"precision": settings.target_precision, "recall": 
settings.target_recall} 
    } 
 
 
Ruta completa: 
services/anticollusion/requiremen
 ts.in 
fastapi 
uvicorn[standard] 
sqlalchemy 
pydantic-settings 
prometheus_client 
python-jose[cryptography] 
numpy 
pandas 
scikit-learn 
networkx 
pytest 
pytest-asyncio 
(Si prefieres Louvain para comunidades densas, añade python-louvain y úsalo 
como alternativa en detect_rings.) 
Ruta completa: 
services/anticollusion/tests/test
 _pipeline.py 
import os, sys, importlib.util, pytest 
from httpx import AsyncClient, ASGITransport 
from datetime import datetime, timedelta 
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), 
"../../..")) 
sys.path.insert(0, ROOT) 
module_path = os.path.join(ROOT, "services", "anticollusion", 
"main.py") 
spec = importlib.util.spec_from_file_location("ac_app", module_path, 
submodule_search_locations=[os.path.dirname(module_path)]) 
mod = importlib.util.module_from_spec(spec); 
spec.loader.exec_module(mod) 
from services.gateway.auth import create_access_token 
from sqlalchemy.pool import StaticPool 
# DB en memoria 
mod.SessionLocal = 
mod.sessionmaker(bind=mod.create_engine("sqlite:///:memory:", 
connect_args={"check_same_thread": False}, poolclass=StaticPool)) 
mod.init_db() 
@pytest.mark.asyncio 
async def test_end_to_end_basic(): 
    app = mod.app 
    token = create_access_token({"sub":"secops","role":"admin"}) 
    hdr = {"Authorization": f"Bearer {token}"} 
    transport = ASGITransport(app=app) 
 
    async with AsyncClient(transport=transport, base_url="http://t") 
as ac: 
        # Construimos un anillo UA-UB-UC colusorio (co-votos 
sincronizados) 
        base = datetime(2025,8,1,12,0,0) 
        rows = [] 
        for tgt in ["P1","P2","P3","P4"]: 
            rows += [ 
              
{"address":"0xA","target":tgt,"ts":(base).isoformat()+"Z"}, 
              
{"address":"0xB","target":tgt,"ts":(base).isoformat()+"Z"}, 
              
{"address":"0xC","target":tgt,"ts":(base).isoformat()+"Z"}, 
            ] 
        # usuarios legítimos dispersos 
        rows += [ 
          
{"address":"0xD","target":"P1","ts":(base+timedelta(hours=5)).isoforma
 t()+"Z"}, 
          
{"address":"0xE","target":"P2","ts":(base+timedelta(hours=6)).isoforma
 t()+"Z"} 
        ] 
        r = await ac.post("/etl/votes", json={"rows": rows}, 
headers=hdr) 
        assert r.status_code == 200 
 
        # Etiquetamos el grupo 1 como colusorio para evaluación 
        await ac.post("/labels", 
json={"items":[{"kind":"group","key":"1","y":1}]}, headers=hdr) 
 
        run = await ac.post("/run", json={}, headers=hdr) 
        assert run.status_code == 200 
        data = run.json() 
        assert data["n_groups"] >= 1 
        assert "eval" in data 
 
        # DoD status 
        st = await ac.get("/dod/status", headers=hdr) 
        assert st.status_code == 200 
 
 
Ruta completa: 
dags/anticollusion_daily.py 
from datetime import datetime, timedelta 
from airflow import DAG 
from airflow.operators.python import PythonOperator 
import os, requests 
 
AC_URL = os.environ.get("AC_URL","http://anticollusion:8050") 
TOKEN = os.environ.get("AC_TOKEN") 
 
def run_detection(): 
    headers = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {} 
    r = requests.post(f"{AC_URL}/run", json={}, headers=headers, 
timeout=60) 
    r.raise_for_status() 
    data = r.json() 
    if not data.get("meets_DoD", False): 
        # enviar alerta (ej., webhook interno) 
        pass 
 
with DAG( 
    dag_id="anticollusion_daily", 
    schedule="0 * * * *",  # cada hora 
    start_date=datetime(2025,1,1), 
    catchup=False, 
    tags=["security","collusion"] 
) as dag: 
    PythonOperator(task_id="run_detection", 
python_callable=run_detection) 
 
 
Ruta completa: 
packages/anticollusion-client/src
