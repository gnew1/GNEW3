from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy import create_engine, select, func, text
from sqlalchemy.orm import sessionmaker
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from .config import settings
from .models import Base, Survey, Response
from .schemas import SurveyCreate, SurveyOut, ResponseIn, ResponseOut
from .utils import compute_nps_bucket, allow_new_survey
import httpx
from datetime import datetime

# Minimal auth dependency: plug your gateway verifier if available
def get_current_user():
    # In prod, import verify from packages.auth_client and decode Authorization header
    return {"sub": "anonymous"}  # fallback for local/dev

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

app = FastAPI(title="GNEW Feedback Service")

SURVEY_CREATED = Counter("gnew_survey_created_total","surveys created")
RESPONSE_SAVED = Counter("gnew_feedback_responses_total","responses saved", ["trigger","nps_bucket"])
SURVEY_LAT = Histogram("gnew_survey_response_latency_seconds","time from event to response")

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()

@app.get("/healthz")
def healthz():
    ok = True
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
    except Exception:
        ok = False
    return JSONResponse({"status": "ok" if ok else "fail"})

@app.get("/metrics")
def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# ---- Survey CRUD (Producto) ----
@app.post("/surveys", response_model=SurveyOut)
def create_survey(body: SurveyCreate, s=Depends(db), user=Depends(get_current_user)):
    sv = Survey(
        name=body.name,
        trigger=body.trigger,
        locale=body.locale,
        frequency_days=body.frequency_days,
        questions=[q.model_dump() for q in body.questions],
    )
    s.add(sv); s.commit(); s.refresh(sv)
    SURVEY_CREATED.inc()
    return SurveyOut(id=sv.id, **body.model_dump())

@app.get("/surveys", response_model=list[SurveyOut])
def list_surveys(trigger: str | None = None, s=Depends(db)):
    q = select(Survey)
    if trigger: q = q.where(Survey.trigger == trigger)
    rows = s.execute(q).scalars().all()
    return [SurveyOut(id=r.id, name=r.name, trigger=r.trigger, locale=r.locale,
                      frequency_days=r.frequency_days, questions=r.questions) for r in rows]

# ---- Trigger endpoint (Frontend calls to know if should show) ----
@app.get("/eligible")
def eligible(user_id: str, event: str, locale: str = "en", s=Depends(db)):
    sv = s.execute(
        select(Survey).where(Survey.trigger==event).where(Survey.locale==locale)
    ).scalars().first()
    if not sv: return {"eligible": False}
    last = s.execute(
        select(func.max(Response.created_at)).where(Response.user_id==user_id).where(Response.survey_id==sv.id)
    ).scalar_one_or_none()
    return {"eligible": allow_new_survey(last, sv.frequency_days), "survey": SurveyOut(
        id=sv.id, name=sv.name, trigger=sv.trigger, locale=sv.locale,
        frequency_days=sv.frequency_days, questions=sv.questions
    )}

# ---- Responses ----
@app.post("/responses", response_model=ResponseOut)
def save_response(body: ResponseIn, s=Depends(db)):
    sv = s.get(Survey, body.survey_id)
    if not sv: raise HTTPException(404, "survey not found")
    # frequency guard
    last = s.execute(
        select(func.max(Response.created_at)).where(Response.user_id==body.user_id).where(Response.survey_id==body.survey_id)
    ).scalar_one_or_none()
    if not allow_new_survey(last, sv.frequency_days):
        raise HTTPException(429, "frequency limit")

    nps_bucket = compute_nps_bucket(body.answers)
    resp = Response(
        survey_id=body.survey_id,
        user_id=body.user_id,
        event=body.event,
        answers=body.answers,
        comment=body.comment,
        nps_bucket=nps_bucket
    )
    s.add(resp); s.commit(); s.refresh(resp)
    RESPONSE_SAVED.labels(trigger=sv.trigger, nps_bucket=nps_bucket or "na").inc()
    # Optional webhook fan-out
    if settings.webhook_outbound_url:
        try:
            with httpx.Client(timeout=2) as c:
                c.post(settings.webhook_outbound_url, json={
                    "survey_id": sv.id, "event": body.event, "user_id": body.user_id,
                    "answers": body.answers, "comment": body.comment, "nps_bucket": nps_bucket,
                    "created_at": datetime.utcnow().isoformat()+"Z"
                })
        except Exception:
            pass
    return ResponseOut(id=resp.id, survey_id=resp.survey_id, created_at=str(resp.created_at))

# ---- Aggregations for dashboards ----
@app.get("/stats/nps")
def nps(trigger: str | None = None, s=Depends(db)):
    q = select(Response.nps_bucket, func.count()).group_by(Response.nps_bucket)
    if trigger:
        q = q.join(Survey, Survey.id==Response.survey_id).where(Survey.trigger==trigger)
    rows = dict(s.execute(q).all())
    promoters = rows.get("promoter", 0)
    detractors = rows.get("detractor", 0)
    totals = sum(rows.values())
    nps_value = ((promoters - detractors) / totals * 100) if totals else 0.0
    return {"totals": rows, "nps": round(nps_value, 2)}

