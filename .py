import smtplib, ssl, json, httpx 
from email.mime.multipart import MIMEMultipart 
from email.mime.text import MIMEText 
from .config import settings 
 
async def send_email(to_email: str, subject: str, html: str): 
    if not settings.smtp_host: 
        return {"status":"noop", "reason":"smtp not configured"} 
    msg = MIMEMultipart("alternative") 
    msg["From"] = settings.from_email 
    msg["To"] = to_email 
    msg["Subject"] = subject 
    msg.attach(MIMEText(html, "html", _charset="utf-8")) 
 
    context = ssl.create_default_context() 
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587) 
as server: 
        server.starttls(context=context) 
        if settings.smtp_user and settings.smtp_pass: 
            server.login(settings.smtp_user, settings.smtp_pass) 
        server.send_message(msg) 
    return {"status":"sent"} 
 
async def send_slack(channel_or_url: str, subject: str, html: str): 
    url = channel_or_url if channel_or_url.startswith("http") else 
(settings.slack_webhook_url or "") 
    if not url: return {"status":"noop", "reason":"slack not 
configured"} 
    # texto simple a Slack; se ignora HTML 
    text = f"*{subject}*\n(HTML adjunto omitido)" 
    async with httpx.AsyncClient(timeout=10) as ac: 
        r = await ac.post(url, json={"text": text}) 
        r.raise_for_status() 
    return {"status":"sent"} 
 
 
Ruta completa: 
services/sponsor_reports/logic.py 
from datetime import datetime, timedelta 
from sqlalchemy.orm import Session 
from sqlalchemy import func 
from .models import Schedule, DeliveryLog, ReportTemplate, 
DeviationRule 
from .data_client import KPIsClient, date_span 
from .render import build_context, render_html 
from .notifier import send_email, send_slack 
 
async def run_schedule(db: Session, schedule_id: int) -> dict: 
    sc = db.get(Schedule, schedule_id) 
    if not sc or not sc.enabled: return {"skipped": True} 
    # datos 
    client = KPIsClient() 
    start, end = date_span(sc.freq, datetime.utcnow()) 
    kpis = await client.overview(sc.project_slug, start, end) 
    ctx = build_context(sc.project_slug, kpis) 
 
    # render template 
    tpl = db.query(ReportTemplate).filter_by(slug=sc.template_slug, 
version=sc.template_version).one() 
    subject, html = render_html(tpl.subject, tpl.body, ctx) 
 
    # entrega 
    email_res = await send_email(sc.sponsor.email, subject, html) 
    slack_res = {} 
    if sc.sponsor.slack_channel: 
        slack_res = await send_slack(sc.sponsor.slack_channel, 
subject, html) 
 
    # guardar log 
    log = DeliveryLog(schedule_id=sc.id, status="ok", 
channel="/".join([x for x in ["email", "slack" if 
sc.sponsor.slack_channel else None] if x]), subject=subject, 
meta={"email": email_res, "slack": slack_res}) 
    db.add(log) 
    # actualizar next_run simple 
    sc.last_run = datetime.utcnow() 
    sc.next_run = compute_next(sc) 
    db.add(sc); db.commit() 
    # chequear desvíos 
    alerts = evaluate_deviation(sc, ctx) 
    return {"delivered": True, "subject": subject, "alerts": alerts} 
 
def compute_next(sc: Schedule): 
    now = datetime.utcnow() 
    if sc.freq == "daily": 
        nxt = datetime(now.year, now.month, now.day, sc.hour_utc) + 
timedelta(days=1) 
    elif sc.freq == "weekly": 
        # siguiente 'dow' a la hora 
        days_ahead = (sc.dow - (now.isoweekday() % 7)) % 7 
        if days_ahead == 0: days_ahead = 7 
        nxt = datetime(now.year, now.month, now.day, sc.hour_utc) + 
timedelta(days=days_ahead) 
    else:  # monthly 
        from calendar import monthrange 
        y, m = now.year, now.month 
        m2 = m + 1 if m < 12 else 1 
        y2 = y if m < 12 else y + 1 
        day = min(sc.dom, monthrange(y2, m2)[1]) 
        nxt = datetime(y2, m2, day, sc.hour_utc) 
    return nxt 
 
def evaluate_deviation(sc: Schedule, ctx: dict) -> list[dict]: 
    """ 
    Evalúa reglas del schedule con valores actuales vs. histórico 
cercano. 
    """ 
    rules = sc.__dict__.get("rules_cache")  # opcional si se precargan 
    alerts = [] 
    if not rules: 
        return alerts 
    # utilitarios 
    def last(name):  
        series = ctx.get(name) or [] 
        return series[-1]["value"] if series else 0 
    def pct_drop(curr, prev):  
        return (prev - curr) / prev if prev else 0.0 
 
    for r in rules: 
        metric_map = 
{"tvl_usd":"tvl","dau":"dau","retention_d7":"ret_d7","retention_d1":"r
 et_d1","retention_d30":"ret_d30"} 
        key = metric_map.get(r["metric"], r["metric"]) 
        ser = ctx.get(key, []) 
        if not ser: continue 
        curr = ser[-1]["value"] 
        prev_idx = max(0, len(ser)-r.get("window_days",7)) 
        prev = ser[prev_idx]["value"] if prev_idx < len(ser) else 
ser[0]["value"] 
 
        hit = False 
        if r["comparator"] == "lt": hit = curr < r["threshold"] 
        elif r["comparator"] == "gt": hit = curr > r["threshold"] 
        elif r["comparator"] == "pct_drop": hit = pct_drop(curr, prev) 
>= r["threshold"] 
        if hit: 
            alerts.append({"metric": r["metric"], "value": curr, 
"rule": r}) 
    return alerts 
 
 
Ruta completa: 
services/sponsor_reports/main.py 
from fastapi import FastAPI, Depends, HTTPException 
from fastapi.security import OAuth2PasswordBearer, 
HTTPAuthorizationCredentials 
from fastapi.responses import JSONResponse 
from starlette.middleware import Middleware 
from sqlalchemy.orm import Session 
from sqlalchemy import text 
from datetime import datetime, timedelta 
from services.common.middleware import LoggingMiddleware 
from services.common.logger import setup_logging 
from services.common.otel import setup_otel 
from packages.auth_client import verify as _verify 
from prometheus_client import start_http_server, Counter, Gauge 
from .config import settings 
from .models import init_db, SessionLocal, Sponsor, ReportTemplate, 
Schedule, DeliveryLog, DeviationRule 
from .logic import run_schedule, compute_next 
setup_logging(settings.service_name, settings.log_level) 
app = FastAPI(title="GNEW Sponsor Reports", 
middleware=[Middleware(LoggingMiddleware)]) 
setup_otel("gnew-sponsor-reports", app) 
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
deliveries_total = Counter("sr_deliveries_total", "Reportes 
entregados", ["status"]) 
punctual_g = Gauge("sr_punctuality", "Puntualidad 1=puntual 0=tarde", 
["schedule"]) 
 
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
 
# ---- Admin: sponsors, templates, schedules ---- 
@app.post("/sponsors") 
async def upsert_sponsor(payload: dict, db: Session = Depends(get_db), 
user: dict = Depends(get_user)): 
    s = Sponsor(name=payload["name"], email=payload["email"], 
slack_channel=payload.get("slack"), meta=payload.get("meta",{})) 
    db.add(s); db.commit(); db.refresh(s) 
    return {"id": s.id} 
 
@app.post("/templates") 
async def create_template(payload: dict, db: Session = 
Depends(get_db), user: dict = Depends(get_user)): 
    t = ReportTemplate(slug=payload["slug"], 
version=payload.get("version","1.0"), 
format=payload.get("format","html"), subject=payload["subject"], 
body=payload["body"]) 
    db.add(t); db.commit(); db.refresh(t) 
    return {"id": t.id} 
 
@app.post("/schedules") 
async def create_schedule(payload: dict, db: Session = 
Depends(get_db), user: dict = Depends(get_user)): 
    s = Schedule( 
        sponsor_id=payload["sponsor_id"], 
        project_slug=payload["project_slug"], 
        template_slug=payload["template_slug"], 
        template_version=payload.get("template_version","1.0"), 
        freq=payload.get("freq","weekly"), 
        dow=payload.get("dow",1), 
        dom=payload.get("dom",1), 
        hour_utc=payload.get("hour_utc", settings.default_hour_utc), 
        enabled=True 
    ) 
    s.next_run = compute_next(s) 
    db.add(s); db.commit(); db.refresh(s) 
    return {"id": s.id, "next_run": s.next_run.isoformat()} 
 
@app.post("/schedules/{sid}/rules") 
async def add_rule(sid: int, payload: dict, db: Session = 
Depends(get_db), user: dict = Depends(get_user)): 
    r = DeviationRule(schedule_id=sid, metric=payload["metric"], 
comparator=payload["comparator"], 
threshold=float(payload["threshold"]), 
window_days=int(payload.get("window_days",7))) 
    db.add(r); db.commit(); db.refresh(r) 
    return {"id": r.id} 
 
# ---- Run manual, preview ---- 
@app.post("/schedules/{sid}/run") 
async def run_now(sid: int, db: Session = Depends(get_db), user: dict 
= Depends(get_user)): 
    res = await run_schedule(db, sid) 
    deliveries_total.labels(status="ok").inc() 
    return res 
 
# ---- DoD: automatización y puntualidad ---- 
@app.get("/dod/status") 
async def dod(db: Session = Depends(get_db), user: dict = 
Depends(get_user)): 
    # Consideramos puntual si últimos n=10 logs están dentro de 
tolerancia 
    logs = 
db.query(DeliveryLog).order_by(DeliveryLog.at.desc()).limit(20).all() 
    if not logs:  
        return {"meets_DoD": False, "message": "no deliveries yet"} 
    ontime = 0; total = 0 
    for lg in logs: 
        sc = db.get(Schedule, lg.schedule_id) 
        if not sc: continue 
        # La entrega es puntual si |at - scheduled_at| <= 
max_delay_minutes 
        scheduled_at = (sc.last_run or lg.at) 
        delta = abs((lg.at - scheduled_at).total_seconds())/60.0 
        p = 1 if delta <= settings.max_delay_minutes else 0 
        punctual_g.labels(schedule=str(sc.id)).set(p) 
        ontime += p; total += 1 
    meets = (ontime/total) >= 0.9  # 90%+ puntuales 
    return {"meets_DoD": meets, "punctual_ratio": 
round(ontime/max(1,total),3), "tolerance_min": 
settings.max_delay_minutes} 
 
 
Ruta completa: 
services/sponsor_reports/template
 s/standard_weekly.html.j2 
<h2>Reporte {{ project }} — Semana</h2> 
<p>Resumen de la semana para el proyecto <b>{{ project }}</b>.</p> 
 
<table border="1" cellpadding="6" cellspacing="0"> 
  <tr><th>Métrica</th><th>Último valor</th><th>Sparkline</th></tr> 
<tr><td>DAU</td><td>{{ last.get("dau", 0) }}</td><td>{% if spark.dau 
%}<img src="{{ spark.dau }}" />{% endif %}</td></tr> 
<tr><td>TVL USD</td><td>{{ last.get("tvl_usd", 0) | round(2) 
}}</td><td>{% if spark.tvl %}<img src="{{ spark.tvl }}" />{% endif 
%}</td></tr> 
<tr><td>Retención D7</td><td>{{ (ret_d7[-1].value if ret_d7) | 
round(3) }}</td><td></td></tr> 
</table> 
<p>Definiciones de KPIs disponibles en el portal (versionadas).</p> 
Ruta completa: 
services/sponsor_reports/requirem
 ents.in 
fastapi 
uvicorn[standard] 
sqlalchemy 
pydantic-settings 
prometheus_client 
python-jose[cryptography] 
httpx 
Jinja2 
matplotlib 
pytest 
pytest-asyncio 
Ruta completa: 
services/sponsor_reports/Dockerfi
 le 
ARG PYTHON_VERSION=3.12-slim 
FROM python:${PYTHON_VERSION} 
WORKDIR /app 
COPY requirements.txt ./ 
RUN pip install --no-cache-dir -r requirements.txt 
COPY . . 
EXPOSE 8060 8061 
HEALTHCHECK --interval=30s --timeout=3s CMD python - <<'PY' || exit 1 
import urllib.request; 
urllib.request.urlopen("http://localhost:8060/health", timeout=3) 
PY 
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8060"] 
Ruta completa: 
services/sponsor_reports/tests/te
 st_flow.py 
import os, sys, importlib.util, pytest 
from httpx import AsyncClient, ASGITransport 
from datetime import datetime 
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), 
"../../..")) 
sys.path.insert(0, ROOT) 
module_path = os.path.join(ROOT, "services", "sponsor_reports", 
"main.py") 
spec = importlib.util.spec_from_file_location("sr_app", module_path, 
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
async def test_basic_schedule_and_run(monkeypatch): 
    app = mod.app 
    token = create_access_token({"sub":"prod","role":"admin"}) 
    hdr = {"Authorization": f"Bearer {token}"} 
 
    # mock KPIs 
    async def _overview(slug, start, end): 
        return { 
            
"dau":[{"date":"2025-08-10","value":100},{"date":"2025-08-11","value":
 120}], 
            
"tvl_usd":[{"date":"2025-08-10","value":1000.0},{"date":"2025-08-11","
 value":1200.0}], 
            "retention_d7":[{"date":"2025-08-11","value":0.33}] 
        } 
    mod.KPIsClient.overview = lambda self,*a,**k: _overview(*a,**k)  # 
type: ignore 
 
    transport = ASGITransport(app=app) 
    async with AsyncClient(transport=transport, base_url="http://t") 
as ac: 
        s = await ac.post("/sponsors", 
json={"name":"Acme","email":"acme@example.com"}, headers=hdr) 
        sid = s.json()["id"] 
        # template 
        t = await ac.post("/templates", 
json={"slug":"weekly","subject":"Reporte {{ project }}","body":"<b>{{ 
project }}</b>"}, headers=hdr) 
        # schedule 
        sch = await ac.post("/schedules", 
json={"sponsor_id":sid,"project_slug":"demo","template_slug":"weekly"}
 , headers=hdr) 
        sched_id = sch.json()["id"] 
        # run 
        r = await ac.post(f"/schedules/{sched_id}/run", headers=hdr) 
        assert r.status_code == 200 
        # DoD 
        d = await ac.get("/dod/status", headers=hdr) 
        assert d.status_code == 200 
 
 
Ruta completa: 
dags/sponsor_reports_cron.py 
from datetime import datetime, timedelta 
from airflow import DAG 
from airflow.operators.python import PythonOperator 
import os, requests 
 
SR_URL = os.environ.get("SR_URL","http://sponsor-reports:8060") 
TOKEN = os.environ.get("SR_TOKEN") 
 
def run_due(): 
    headers = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {} 
    # consulta de schedules due: demo simple — en prod: endpoint 
dedicado o job que calcule next_run 
    r = requests.get(f"{SR_URL}/health", timeout=10) 
    assert r.ok 
    # si hubiese endpoint /due, aquí lo llamarías; para demo, se puede 
parametrizar IDs: 
    ids = [s for s in os.environ.get("SR_SCHEDULE_IDS","").split(",") 
if s] 
    for sid in ids: 
        try: 
            requests.post(f"{SR_URL}/schedules/{sid}/run", 
headers=headers, timeout=30) 
        except Exception: 
            pass 
 
with DAG( 
    dag_id="sponsor_reports_cron", 
    schedule="0 9 * * 1",  # Lunes 09:00 UTC (semanal); se despliegan 
múltiples DAGs por freq 
    start_date=datetime(2025,1,1), catchup=False, 
tags=["reports","sponsors"] 
) as dag: 
    PythonOperator(task_id="run_due", python_callable=run_due) 
 
 
Ruta completa: 
packages/sponsor-reports-client/s
 rc/index.ts 
export class SponsorReportsClient { 
  constructor(private baseUrl: string, private token?: string) {} 
  private h(){ return { "Content-Type": "application/json", 
...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) }; } 
  async createSponsor(name: string, email: string, slack?: string){ 
    const r = await fetch(`${this.baseUrl}/sponsors`, {method:"POST", 
headers:this.h(), body: JSON.stringify({name, email, slack})}); 
    if(!r.ok) throw new Error("createSponsor"); return r.json(); 
  } 
  async addTemplate(slug: string, subject: string, body: string, 
version="1.0"){ 
    const r = await fetch(`${this.baseUrl}/templates`, {method:"POST", 
headers:this.h(), body: JSON.stringify({slug, subject, body, 
version})}); 
    if(!r.ok) throw new Error("addTemplate"); return r.json(); 
  } 
  async createSchedule(payload: any){ 
    const r = await fetch(`${this.baseUrl}/schedules`, {method:"POST", 
headers:this.h(), body: JSON.stringify(payload)}); 
    if(!r.ok) throw new Error("createSchedule"); return r.json(); 
  } 
  async runSchedule(id: number){ 
    const r = await fetch(`${this.baseUrl}/schedules/${id}/run`, 
{method:"POST", headers:this.h()}); 
    if(!r.ok) throw new Error("runSchedule"); return r.json(); 
  } 
  async addRule(scheduleId: number, rule: {metric:string; 
comparator:"lt"|"gt"|"pct_drop"; threshold:number; 
window_days?:number}){ 
    const r = await 
fetch(`${this.baseUrl}/schedules/${scheduleId}/rules`, {method:"POST", 
headers:this.h(), body: JSON.stringify(rule)}); 
    if(!r.ok) throw new Error("addRule"); return r.json(); 
  } 
  async dodStatus(){ 
    const r = await fetch(`${this.baseUrl}/dod/status`, 
{headers:this.h()}); 
    if(!r.ok) throw new Error("dodStatus"); return r.json(); 
  } 
} 
 
 
Cómo cumple el Prompt 
● Objetivo – Actualizaciones programadas: 
 
○ Schedule con frecuencia (daily/weekly/monthly), hora UTC, y cálculo de 
next_run. 
 
○ DAG sponsor_reports_cron.py ejecuta los IDs debidos; el servicio 
también permite run manual. 
● Roles – Producto, Data: 
○ Producto: ReportTemplate Jinja2 con subject y body, versionadas por 
slug+version. 
○ Data: extracción de KPIs desde el servicio kpis 
(DAU/WAU/MAU/retenciones/TVL), construcción de contexto, sparklines inline. 
● Entregables – informes templados; alertas de desvío: 
○ Informes HTML (y fácilmente exportables a PDF si se añade motor), enviados 
por email y/o Slack. 
○ DeviationRule por schedule (lt, gt, pct_drop) con ventana; se devuelven 
alerts junto con cada entrega. 
● DoD – entregas puntuales automatizadas: 
○ Prometheus: sr_deliveries_total, sr_punctuality{schedule}. 
○ Endpoint /dod/status calcula ratio de puntualidad sobre las últimas entregas 
y lo compara con tolerancia (max_delay_minutes); devuelve meets_DoD. 
○ Programación mediante Airflow DAG y/o jobs internos (next_run), asegurando 
automatización. 
Siguientes pasos opcionales 
● Añadir endpoint /due que seleccione schedules por next_run <= now para que el 
DAG no necesite IDs. 
● Adjuntar CSV/Parquet con series enviadas (reutilizando export de kpis). 
● Soporte PDF (añadir WeasyPrint o xhtml2pdf) para adjuntos imprimibles. 
● Plantillas multilenguaje y branding por patrocinador (logo/colores en Jinja). 
¿Quieres que agregue la generación PDF y un endpoint /due para que el cron recoja 
automáticamente los schedules pendientes? 
programa a nivel de detalle y entrega para GNEW N120 12.10 Egresos GAS-less para usuarios 
(Prompt 120) Objetivo: Patrocinar gas en acciones críticas. Roles: Back, SC, DevOps. Stack: 
relayers/paymasters. DoD: UX sin fricción y con límites. 
ChatGPT Plus 
Pensó durante 43s 
