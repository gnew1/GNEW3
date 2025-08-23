export class AntiCollusionClient { 
  constructor(private baseUrl: string, private token?: string) {} 
  private h(){ return {"Content-Type":"application/json", 
...(this.token?{Authorization:`Bearer ${this.token}`}:{})}; } 
 
  async ingestVotes(rows: {address:string; target:string; ts:string; 
value?:number; meta?:any}[]) { 
    const r = await fetch(`${this.baseUrl}/etl/votes`, { 
method:"POST", headers:this.h(), body: JSON.stringify({ rows }) }); 
    if (!r.ok) throw new Error(`ingestVotes failed ${r.status}`); 
return r.json(); 
  } 
  async label(items: {kind:"group"|"user"; key:string|number; 
y:0|1}[]) { 
    const r = await fetch(`${this.baseUrl}/labels`, { method:"POST", 
headers:this.h(), body: JSON.stringify({ items }) }); 
    if (!r.ok) throw new Error(`labels failed ${r.status}`); return 
r.json(); 
  } 
  async run() { 
    const r = await fetch(`${this.baseUrl}/run`, { method:"POST", 
headers:this.h(), body: JSON.stringify({}) }); 
    if (!r.ok) throw new Error(`run failed ${r.status}`); return 
r.json(); 
} 
async groups(batch_id: string) { 
const r = await fetch(`${this.baseUrl}/groups/${batch_id}`, { 
headers:this.h() }); 
if (!r.ok) throw new Error(`groups failed ${r.status}`); return 
r.json(); 
} 
async dodStatus() { 
const r = await fetch(`${this.baseUrl}/dod/status`, { 
headers:this.h() }); 
if (!r.ok) throw new Error(`status failed ${r.status}`); return 
r.json(); 
} 
} 
Ruta completa: 
services/anticollusion/Dockerfile 
ARG PYTHON_VERSION=3.12-slim 
FROM python:${PYTHON_VERSION} AS base 
WORKDIR /app 
COPY requirements.txt ./ 
RUN pip install --no-cache-dir -r requirements.txt 
COPY . . 
EXPOSE 8050 8051 
HEALTHCHECK --interval=30s --timeout=3s CMD python - <<'PY' || exit 1 
import urllib.request 
try: 
urllib.request.urlopen("http://localhost:8050/health", timeout=2) 
print("ok") 
except Exception as e: 
print(e); raise 
PY 
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8050"] 
Cómo detecta anillos y patrones anómalos 
● Grafo de co‑voto (no dirigido): nodos = usuarios, aristas con señales: 
○ Jaccard de conjuntos de objetivos votados (alta similitud). 
○ Sincronía temporal (co‑votos dentro de ventana ±time_window_minutes). 
○ Co‑votos (conteo mínimo min_votes_per_pair). 
○ Peso = 0.6·jaccard + 0.3·sincronía + 0.1·min(1, co/10). 
● Anillos: componentes con ciclos (cycle_basis), densidad ≥ ring_max_density o 
avg_jacc alto. 
● Scoring: 
○ No supervisado: IsolationForest sobre [size, density, avg_jacc, score]. 
○ Supervisado: si hay labels de grupos, entrena LogisticRegression, barrido de 
threshold con precision‑recall; selecciona threshold que cumpla targets 
(target_precision, target_recall), si no, maximiza F1. 
● Explicabilidad: para cada grupo: density, avg_jaccard, score, reason; por par 
/pair/{ua}/{ub} expone jaccard, co_votes, time_sync, weight. 
DoD (precision/recall > objetivo) 
● POST /run guarda métricas en run_metrics y publica gauges Prometheus 
ac_precision, ac_recall. 
● GET /dod/status compara con target_precision y target_recall (config) y 
devuelve meets_DoD. 
● El DAG anticollusion_daily.py ejecuta periódicamente y permite alertar si cae 
por debajo de objetivos. 
Integración y siguientes pasos opcionales 
● Conectar ETL a tus fuentes (e.g., votos on‑chain, reseñas, contribuciones QF) 
adaptando /etl/votes. 
● Añadir features dispositivo/IP, VC/DID weight, transferencias entre direcciones para 
mayor poder de señal. 
● Añadir comunidad Louvain y motifs (triángulos/4‑cliques) para refinar grupos. 
● Exportar subgrafo GEXF por grupo para inspección en Gephi. 
¿Quieres que lo conecte directamente a tus servicios reviews/qf para consumir sus eventos y 
etiquetar automáticamente algunos casos? 
Tú dijiste: 
desarrolla a detalle de programación N119 12.9 Reportes a patrocinadores (Prompt 119) 
Objetivo: Actualizaciones programadas. Roles: Producto, Data. Entregables: informes 
templados; alertas de desvío. DoD: entregas puntuales automatizadas. 
ChatGPT Plus 
Pensó durante 27s 
Aquí tienes el programa a nivel de detalle y la programación para GNEW N119 · 12.9 
Reportes a patrocinadores (Prompt 119). Entrego un servicio FastAPI sponsor_reports 
integrado con tu stack (N110–N118): ETL desde KPIs, plantillas versionadas, scheduler + 
DAG, alertas por desvío, métricas Prometheus, entregas automatizadas (correo/webhook) y 
un endpoint de DoD que valida puntualidad. 
Ruta completa: 
services/sponsor_reports/config.p
 y 
from pydantic_settings import SettingsConfigDict 
from services.common.config import CommonSettings 
 
class Settings(CommonSettings): 
    service_name: str = "sponsor_reports" 
    database_url: str = "sqlite:///./sponsor_reports.db" 
    metrics_port: int = 8061 
 
    # Fuentes de datos 
    kpis_api: str | None = None  # ej: http://kpis:8030 
 
    # Entrega 
    smtp_host: str | None = None 
    smtp_port: int | None = None 
    smtp_user: str | None = None 
    smtp_pass: str | None = None 
    from_email: str = "reports@gnew.local" 
    slack_webhook_url: str | None = None 
 
    # Programación 
    tz: str = "UTC" 
    default_hour_utc: int = 9     # 09:00 UTC por defecto 
 
    # DoD (puntualidad) 
    max_delay_minutes: int = 15   # tolerancia para considerar 
“puntual” 
 
    model_config = SettingsConfigDict(env_file=".env") 
 
settings = Settings() 
 
 
Ruta completa: 
services/sponsor_reports/models.p
 y 
from sqlalchemy import ( 
    create_engine, Column, Integer, String, Float, DateTime, JSON, 
Boolean, ForeignKey, UniqueConstraint, Index 
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
 
class Sponsor(Base): 
    __tablename__ = "sponsors" 
    id = Column(Integer, primary_key=True) 
    name = Column(String, index=True) 
    email = Column(String, index=True) 
    slack_channel = Column(String, nullable=True) 
    meta = Column(JSON, default=dict) 
    created_at = Column(DateTime, default=datetime.utcnow) 
 
class ReportTemplate(Base): 
    __tablename__ = "report_templates" 
    id = Column(Integer, primary_key=True) 
    slug = Column(String, index=True)     # p.ej. monthly_standard 
    version = Column(String, default="1.0") 
    format = Column(String, default="html")  # html|md 
    subject = Column(String) 
    body = Column(String)                 # Jinja2 
    created_at = Column(DateTime, default=datetime.utcnow) 
    __table_args__ = (UniqueConstraint("slug","version", 
name="uq_template"),) 
 
class Schedule(Base): 
    __tablename__ = "schedules" 
    id = Column(Integer, primary_key=True) 
    sponsor_id = Column(Integer, ForeignKey("sponsors.id"), 
index=True) 
    project_slug = Column(String, index=True) 
    template_slug = Column(String) 
    template_version = Column(String, default="1.0") 
    freq = Column(String, default="weekly")  # daily|weekly|monthly 
    dow = Column(Integer, default=1)         # 1=Mon … 7=Sun (para 
weekly) 
    dom = Column(Integer, default=1)         # 1..31 (para monthly) 
    hour_utc = Column(Integer, default=settings.default_hour_utc) 
    enabled = Column(Boolean, default=True) 
    last_run = Column(DateTime, nullable=True) 
    next_run = Column(DateTime, nullable=True) 
    params = Column(JSON, default=dict)      # umbrales, comparativas, 
etc. 
    sponsor = relationship("Sponsor") 
 
class DeliveryLog(Base): 
    __tablename__ = "delivery_log" 
    id = Column(Integer, primary_key=True) 
    schedule_id = Column(Integer, ForeignKey("schedules.id"), 
index=True) 
    at = Column(DateTime, default=datetime.utcnow, index=True) 
    status = Column(String, default="ok")    # ok|warn|error 
    channel = Column(String)                 # email|slack|webhook 
    subject = Column(String) 
    meta = Column(JSON, default=dict) 
    schedule = relationship("Schedule") 
 
class DeviationRule(Base): 
    __tablename__ = "deviation_rules" 
    id = Column(Integer, primary_key=True) 
    schedule_id = Column(Integer, ForeignKey("schedules.id"), 
index=True) 
    metric = Column(String)       # p.ej. dau|retention_d7|tvl_usd 
    comparator = Column(String)   # lt|gt|pct_drop 
    threshold = Column(Float)     # 1000 / 0.2 (20%)… 
    window_days = Column(Integer, default=7) 
    enabled = Column(Boolean, default=True) 
 
def init_db(): Base.metadata.create_all(bind=engine) 
 
 
Ruta completa: 
services/sponsor_reports/data_cli
 ent.py 
import httpx 
from datetime import datetime, timedelta 
 
from .config import settings 
 
class KPIsClient: 
    def __init__(self, base: str | None = None): 
        self.base = base or settings.kpis_api 
 
    async def overview(self, slug: str, start: str, end: str) -> dict: 
        async with httpx.AsyncClient(timeout=20) as ac: 
            r = await ac.get(f"{self.base}/kpis/overview/{slug}", 
params={"_from": start, "_to": end}) 
            r.raise_for_status() 
            return r.json() 
 
    async def defs(self) -> list: 
        async with httpx.AsyncClient(timeout=10) as ac: 
            r = await ac.get(f"{self.base}/definitions") 
            r.raise_for_status() 
            return r.json() 
 
def date_span(freq: str, ref: datetime) -> tuple[str,str]: 
    if freq == "daily": 
        start = ref.date().isoformat(); end = ref.date().isoformat() 
    elif freq == "weekly": 
        start = (ref - timedelta(days=6)).date().isoformat(); end = 
ref.date().isoformat() 
    else:  # monthly (last 30 días) 
        start = (ref - timedelta(days=29)).date().isoformat(); end = 
ref.date().isoformat() 
    return start, end 
 
 
Ruta completa: 
services/sponsor_reports/render.p
 y 
from jinja2 import Environment, BaseLoader, select_autoescape 
import base64, io 
from matplotlib import pyplot as plt 
 
env = Environment( 
    loader=BaseLoader(), 
    autoescape=select_autoescape(enabled_extensions=("html","xml")) 
) 
 
def _sparkline(series: list[float]) -> str: 
    """Devuelve un <img> base64 con sparkline simple (matplotlib, sin 
estilos).""" 
    if not series: return "" 
    fig = plt.figure(figsize=(2.4,0.6), dpi=150) 
    plt.plot(series) 
    plt.xticks([]); plt.yticks([]) 
    buf = io.BytesIO() 
    plt.savefig(buf, format="png", bbox_inches="tight") 
    plt.close(fig) 
    return "data:image/png;base64," + 
base64.b64encode(buf.getvalue()).decode() 
 
def build_context(project_slug: str, kpis: dict) -> dict: 
    def series(name):  
        arr = kpis.get(name, []) 
        return [x["value"] for x in arr] 
    ctx = { 
        "project": project_slug, 
        "dau": kpis.get("dau", []), 
        "wau": kpis.get("wau", []), 
        "mau": kpis.get("mau", []), 
        "tvl": kpis.get("tvl_usd", []), 
        "ret_d1": kpis.get("retention_d1", []), 
        "ret_d7": kpis.get("retention_d7", []), 
        "ret_d30": kpis.get("retention_d30", []), 
        "spark": { 
            "dau": _sparkline(series("dau")), 
            "tvl": _sparkline(series("tvl_usd")), 
        }, 
        "last": {k: (v[-1]["value"] if v else 0) for k,v in 
kpis.items()} 
    } 
    return ctx 
 
def render_html(subject: str, body_tpl: str, ctx: dict) -> 
tuple[str,str]: 
    tpl = env.from_string(body_tpl) 
    html = tpl.render(**ctx) 
    subj = env.from_string(subject).render(**ctx) 
    return subj, html 
 
 
Ruta completa: 
services/sponsor_reports/notifier
