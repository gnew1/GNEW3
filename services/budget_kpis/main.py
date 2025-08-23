from fastapi import FastAPI 
from pydantic import BaseModel 
from web3 import Web3 
from prometheus_client import start_http_server, Gauge, Counter 
import time 
from decimal import Decimal 
from jinja2 import Template 
from reportlab.pdfgen import canvas 
from reportlab.lib.pagesizes import A4 
from .config import settings 
REG_ABI = 
'[{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],
 "name":"getStatus","outputs":[{"internalType":"uint8","name":"","type"
 :"uint8"},{"internalType":"uint256","name":"fiscalYear","type":"uint25
 6"},{"internalType":"address","name":"token","type":"address"},{"inter
 nalType":"address","name":"controller","type":"address"},{"internalTyp
 e":"string","name":"cid","type":"string"}],"stateMutability":"view","t
 ype":"function"},{"inputs":[{"internalType":"uint256","name":"id","typ
 e":"uint256"},{"internalType":"uint8","name":"q","type":"uint8"},{"int
 ernalType":"bytes32","name":"catId","type":"bytes32"}],"name":"getPlan
 ","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"s
 tateMutability":"view","type":"function"},{"inputs":[{"internalType":"
 uint256","name":"id","type":"uint256"},{"internalType":"uint8","name":
 "q","type":"uint8"},{"internalType":"bytes32","name":"catId","type":"b
 ytes32"}],"name":"getActual","outputs":[{"internalType":"uint256","nam
 e":"","type":"uint256"}],"stateMutability":"view","type":"function"}]' 
# Nota: KPIs reales obtendrán la lista de categorías desde off-chain 
(CID). Aquí se pasa por query param o configuración. 
app = FastAPI(title="GNEW Budget KPIs") 
w3 = Web3(Web3.HTTPProvider(settings.rpc_url)) 
registry = 
w3.eth.contract(address=Web3.to_checksum_address(settings.registry_add
 r), abi=REG_ABI) 
DELTA_GAUGE = Gauge("budget_delta_bps", "Delta (bps) actual vs plan 
por categoría", ["budget_id","quarter","category"]) 
BURN_GAUGE  = Gauge("budget_burn_ratio", "Burn (actual/plan) ratio", 
["budget_id","quarter"]) 
REPORTS     = Counter("budget_reports_total", "Reportes trimestrales 
generados", ["budget_id","quarter"]) 
 
class KPIOut(BaseModel): 
    budget_id: int 
    quarter: int 
    by_category: dict 
    total_plan: str 
    total_actual: str 
    burn_ratio: float 
    delta_bps: float 
 
def _wei_to_str(x): return f"{Decimal(x)/Decimal(10**18):.2f}" 
 
@app.get("/kpi") 
def kpi(budget_id: int, quarter: int, categories: str): 
    cats = [c.strip() for c in categories.split(",") if c.strip()] 
    total_plan = 0; total_actual = 0 
    by = {} 
    for cat in cats: 
        cid = Web3.keccak(text=cat).hex() 
        plan = registry.functions.getPlan(budget_id, quarter-1, 
cid).call() 
        actual = registry.functions.getActual(budget_id, quarter-1, 
cid).call() 
        by[cat] = {"plan": _wei_to_str(plan), "actual": 
_wei_to_str(actual)} 
        total_plan += plan; total_actual += actual 
        delta = 0 if plan == 0 else (abs(int(plan) - int(actual)) * 
10000) / ((int(plan) + int(actual))//2 if (plan+actual)>0 else 1) 
        DELTA_GAUGE.labels(str(budget_id), str(quarter), 
cat).set(delta) 
    burn = 0.0 if total_plan == 0 else 
float(total_actual)/float(total_plan) 
    BURN_GAUGE.labels(str(budget_id), str(quarter)).set(burn) 
    return KPIOut( 
        budget_id=budget_id, quarter=quarter, by_category=by, 
        total_plan=_wei_to_str(total_plan), 
total_actual=_wei_to_str(total_actual), 
        burn_ratio=burn, 
delta_bps=(abs(total_plan-total_actual)*10000)/(((total_plan+total_act
 ual)//2) if (total_plan+total_actual)>0 else 1) 
    ) 
 
@app.get("/report/quarterly.pdf") 
def report(budget_id: int, quarter: int, categories: str): 
    k = kpi(budget_id, quarter, categories) 
    # PDF simple 
    from io import BytesIO 
    buf = BytesIO() 
    c = canvas.Canvas(buf, pagesize=A4) 
    width, height = A4 
    y = height - 40 
    c.setFont("Helvetica-Bold", 14) 
    c.drawString(40, y, f"GNEW Budget Q{quarter} 
FY{settings.target_fy} — Presupuesto #{budget_id}") 
    y -= 24; c.setFont("Helvetica", 10) 
    c.drawString(40, y, f"Total plan: {k.total_plan} | Total actual: 
{k.total_actual} | Burn: {k.burn_ratio:.2%}") 
    y -= 16 
    c.drawString(40, y, f"Delta bps vs plan: {k.delta_bps:.1f} (DoD: ≤ 
X%)") 
    y -= 20 
    c.setFont("Helvetica-Bold", 10) 
    c.drawString(40, y, "Categoría"); c.drawString(220, y, "Plan"); 
c.drawString(340, y, "Actual") 
    y -= 12; c.line(40, y, width-40, y); y -= 10; 
c.setFont("Helvetica", 10) 
    for cat, vals in k.by_category.items(): 
        c.drawString(40, y, cat) 
        c.drawRightString(300, y, vals["plan"]) 
        c.drawRightString(420, y, vals["actual"]) 
        y -= 14 
        if y < 80: c.showPage(); y = height - 50 
    c.showPage(); c.save() 
    REPORTS.labels(str(budget_id), str(quarter)).inc() 
    from fastapi.responses import Response 
    return Response(buf.getvalue(), media_type="application/pdf") 
 
 
