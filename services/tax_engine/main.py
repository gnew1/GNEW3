from fastapi import FastAPI, HTTPException 
from fastapi.responses import FileResponse 
from pydantic import BaseModel 
from prometheus_client import start_http_server, Counter, Gauge 
import pandas as pd, os, sqlite3, hashlib 
from datetime import datetime 
from .config import settings 
from .models import Tx, Consent, WithholdingInput 
from .withholding import compute_withholding 
from .generators import gen_iva_es_303, gen_is_es_pagos_fracc, 
gen_irpf_111, gen_1099nec_csv, gen_crs_xml 
from .iva import compute_vat_es 
app = FastAPI(title="GNEW Tax Engine") 
start_http_server(8040) 
REQS = Counter("taxengine_requests_total","Requests",["endpoint"]) 
VALID = 
Counter("taxengine_validations_total","Validations",["model","result"]
 ) 
WITHH = Gauge("taxengine_withholding_rate","Withholding 
rate",["jurisdiction"]) 
# --- Consentimientos (controles) --- 
def db(): 
os.makedirs(os.path.dirname(settings.sqlite_path), exist_ok=True) 
    return sqlite3.connect(settings.sqlite_path) 
 
def ensure_tables(): 
    con = db(); c = con.cursor() 
    c.execute("""CREATE TABLE IF NOT EXISTS consent ( 
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        subject_id TEXT, kind TEXT, version TEXT, accepted_at TEXT, 
payload_hash TEXT 
    )""") 
    con.commit(); con.close() 
ensure_tables() 
 
@app.post("/consent/store") 
def consent_store(cons: Consent): 
    h = cons.model_dump() 
    con = db(); cur = con.cursor() 
    cur.execute("INSERT INTO 
consent(subject_id,kind,version,accepted_at,payload_hash) VALUES 
(?,?,?,?,?)", 
                (cons.subject_id, cons.kind, cons.version, 
cons.accepted_at, cons.payload_hash)) 
    con.commit(); con.close() 
    return {"ok": True} 
 
@app.get("/consent/check") 
def consent_check(subject_id: str, kind: str): 
    con = db(); cur = con.cursor() 
    cur.execute("SELECT 1 FROM consent WHERE subject_id=? AND kind=? 
ORDER BY id DESC LIMIT 1",(subject_id,kind)) 
    row = cur.fetchone(); con.close() 
    return {"has_consent": bool(row)} 
 
# --- Conexión subledger (N102) --- 
@app.get("/subledger/sample") 
def subledger_sample(): 
    # formato base de entrada 
    return { 
        "columns": 
["txid","date","country_code","type","customer_tax_id","customer_is_bu
 siness","category","currency","amount_net","vat_rate","account"], 
        "example": 
["tx123","2025-01-16","ES","service","ESB12345678",True,"hosteleria","
 EUR",1000.00,None,"700.1"] 
    } 
 
@app.post("/vat/es/compute") 
def vat_es_compute(items: list[Tx], period: str, taxpayer_vat: str): 
    REQS.labels("vat_es_compute").inc() 
    df = pd.DataFrame([i.model_dump() for i in items]) 
    totals, df2 = compute_vat_es(df) 
    out = gen_iva_es_303(settings.out_dir, taxpayer_vat, period, 
totals) 
    if not out.get("ok"): raise HTTPException(422, {"errors": 
out["errors"]}) 
    return {"ok": True, "iva_303_path": out["path"], "totals": totals, 
"lines": df2.to_dict(orient="records")} 
 
class ISInput(BaseModel): 
    fy: int 
    q: int 
    base: float 
    rate: float 
 
@app.post("/is/es/pago-fraccionado") 
def is_es_pago_fraccionado(inp: ISInput): 
    REQS.labels("is_es_pago_fraccionado").inc() 
    out = gen_is_es_pagos_fracc(settings.out_dir, inp.fy, inp.q, 
inp.base, inp.rate) 
    if not out.get("ok"): raise HTTPException(422, {"errors": 
out["errors"]}) 
    return out 
 
@app.post("/irpf/es/111") 
def irpf_es_111(fy: int, q: int, records: list[dict]): 
    REQS.labels("irpf_es_111").inc() 
    out = gen_irpf_111(settings.out_dir, fy, q, records) 
    if not out.get("ok"): raise HTTPException(422, {"errors": 
out["errors"]}) 
    return out 
 
@app.post("/withholding/compute") 
def withholding_compute(inp: WithholdingInput): 
    REQS.labels("withholding_compute").inc() 
    res = compute_withholding(inp) 
    WITHH.labels(inp.jurisdiction).set(res.rate) 
    return res 
 
@app.post("/us/1099nec") 
def us_1099nec(tax_year: int, payer: dict, payee: dict, box1: float, 
box4: float = 0.0): 
    REQS.labels("us_1099nec").inc() 
    out = gen_1099nec_csv(settings.out_dir, tax_year, payer, payee, 
box1, box4) 
    if not out.get("ok"): raise HTTPException(422, {"errors": 
out["errors"]}) 
    return out 
 
@app.post("/crs/xml") 
def crs_xml(reporting_period: str, accounts: list[dict]): 
    REQS.labels("crs_xml").inc() 
    out = gen_crs_xml(settings.out_dir, reporting_period, accounts) 
    if not out.get("ok"): raise HTTPException(422, {"errors": 
out["errors"]}) 
    # devolvemos archivo 
    return {"ok": True, "path": out["path"]} 
 
@app.get("/download") 
def download(path: str): 
    if not os.path.exists(path): raise HTTPException(404, "not found") 
    return FileResponse(path) 
 
 
