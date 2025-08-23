from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
from prometheus_client import Counter, Gauge, Summary, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import PlainTextResponse

app = FastAPI(title="Security Bridge")

# --- Métricas públicas ---
CVE = Gauge("sec_cves_total", "CVE count by severity", ["severity","source"])
INC_OPEN = Gauge("sec_incidents_open_total", "Incidents currently open", ["severity"])
INC_NEW = Counter("sec_incidents_new_total", "New incidents created", ["severity","source"])
MTTD = Histogram("sec_mttd_seconds", "Time to detect (seconds)", buckets=[30,60,120,180,300,600,900,1800])

@app.get("/metrics")
def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/healthz")
def healthz(): return {"ok": True}

# --- Ingesta CI/SBOM → CVEs ---
class CveItem(BaseModel):
    severity: str
    count: int
    source: str = "ci"

    @field_validator("severity")
    @classmethod
    def sev(cls, v): return v.lower()

class CvePayload(BaseModel):
    items: list[CveItem]

@app.post("/ingest/cves")
def ingest_cves(payload: CvePayload):
    by_key = {}
    for it in payload.items:
        key = (it.severity, it.source)
        by_key[key] = by_key.get(key, 0) + it.count
    # set gauges
    for (sev, src), val in by_key.items():
        CVE.labels(severity=sev, source=src).set(val)
    return {"ok": True, "keys": len(by_key)}

# --- Ingesta incidentes (para MTTD & abiertos) ---
class IncidentOpen(BaseModel):
    id: str
    severity: str

class IncidentDetect(BaseModel):
    id: str
    severity: str
    opened_at: float  # epoch seconds
    detected_at: float

@app.post("/ingest/incident/open")
def incident_open(i: IncidentOpen):
    INC_OPEN.labels(severity=i.severity).inc()
    INC_NEW.labels(severity=i.severity, source="bridge").inc()
    return {"ok": True}

@app.post("/ingest/incident/close")
def incident_close(i: IncidentOpen):
    INC_OPEN.labels(severity=i.severity).dec()
    return {"ok": True}

@app.post("/ingest/incident/detected")
def incident_detected(i: IncidentDetect):
    delta = max(0.0, i.detected_at - i.opened_at)
    MTTD.observe(delta)
    return {"ok": True, "mttd": delta}

