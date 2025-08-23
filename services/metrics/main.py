import os 
import io 
import csv 
import time 
import hashlib 
from datetime import datetime, timedelta 
from typing import Literal, Optional 
from fastapi import FastAPI, Query, Body, HTTPException, Response 
from fastapi.middleware.cors import CORSMiddleware 
from starlette.middleware import Middleware 
from starlette.responses import StreamingResponse, JSONResponse 
from sqlalchemy import ( 
create_engine, 
Column, 
Integer, 
String, 
DateTime, 
Float, 
Index, 
) 
from sqlalchemy.orm import declarative_base, sessionmaker 
from services.common.middleware import LoggingMiddleware, 
ExceptionMiddleware 
from services.common.otel import setup_otel 
from services.common.health import health_response 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Config 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./metrics.db") 
ENVIRONMENT = os.getenv("ENVIRONMENT", "dev") 
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "10"))  # DoD: 
refresh ≤ 10 s 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# DB setup 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
engine = create_engine( 
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if 
DATABASE_URL.startswith("sqlite") else {}, 
) 
SessionLocal = sessionmaker(bind=engine, autoflush=False, 
autocommit=False) 
Base = declarative_base() 
 
 
class Event(Base): 
    """ 
    Generic event stream to compute KPIs. 
 
    type: 
      - "message_posted"           (participation) 
      - "vote_cast"                (participation) 
      - "delegated_to"             (delegation) 
      - "delegation_revoked"       (delegation) 
      - "first_response_latency"   (times) -> value in seconds 
    """ 
    __tablename__ = "events" 
    id = Column(Integer, primary_key=True) 
    type = Column(String, index=True, nullable=False) 
    user = Column(String, index=True, nullable=False)  # actor 
    debate_id = Column(String, index=True, nullable=True) 
    target_user = Column(String, index=True, nullable=True)  # for 
delegation 
    value = Column(Float, nullable=True)  # e.g., seconds 
    created_at = Column(DateTime, default=datetime.utcnow, index=True) 
 
Index("ix_events_combo", Event.type, Event.debate_id, 
Event.created_at) 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# App 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
middleware = [ 
Middleware(LoggingMiddleware), 
Middleware(ExceptionMiddleware), 
] 
app = FastAPI(title="Metrics Service", version="0.1.0", 
middleware=middleware) 
# CORS for the web dashboard 
app.add_middleware( 
CORSMiddleware, 
allow_origins=["*"] if ENVIRONMENT != "production" else 
os.getenv("CORS_ALLOW_ORIGINS", "").split(","), 
allow_credentials=True, 
allow_methods=["*"], 
allow_headers=["*"], 
) 
setup_otel("metrics", app) 
Base.metadata.create_all(bind=engine) 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Small in‑memory cache (DoD: refresh ≤ 10 s) 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
_CACHE: dict[str, tuple[float, dict]] = {} 
def cache_key(name: str, **params) -> str: 
raw = name + "|" + "|".join(f"{k}={v}" for k, v in 
sorted(params.items())) 
    return hashlib.sha1(raw.encode()).hexdigest() 
 
def get_cached(name: str, **params) -> Optional[dict]: 
    key = cache_key(name, **params) 
    item = _CACHE.get(key) 
    if not item: 
        return None 
    ts, data = item 
    if time.time() - ts > CACHE_TTL_SECONDS: 
        return None 
    return data 
 
def set_cached(name: str, data: dict, **params) -> None: 
    key = cache_key(name, **params) 
    _CACHE[key] = (time.time(), data) 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Helpers 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
def csv_response(rows: list[dict], filename: str = "metrics.csv") -> 
StreamingResponse: 
    buf = io.StringIO() 
    if rows: 
        writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys())) 
        writer.writeheader() 
        for r in rows: 
            writer.writerow(r) 
    else: 
        buf.write("")  # empty file 
    buf.seek(0) 
    headers = { 
        "Content-Disposition": f'attachment; filename="{filename}"', 
        "Cache-Control": f"public, max-age={CACHE_TTL_SECONDS}", 
    } 
    return StreamingResponse(iter([buf.read()]), 
media_type="text/csv", headers=headers) 
 
def json_cache_headers(resp: JSONResponse) -> None: 
    resp.headers["Cache-Control"] = f"public, 
max-age={CACHE_TTL_SECONDS}" 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Ingestion (optional, for services without direct DB integration yet) 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
@app.post("/ingest") 
def ingest_event( 
    type: Literal[ 
        "message_posted", 
        "vote_cast", 
        "delegated_to", 
        "delegation_revoked", 
        "first_response_latency", 
    ] = Body(..., embed=True), 
    user: str = Body(..., embed=True), 
    debate_id: Optional[str] = Body(None, embed=True), 
    target_user: Optional[str] = Body(None, embed=True), 
    value: Optional[float] = Body(None, embed=True), 
    created_at: Optional[datetime] = Body(None, embed=True), 
): 
    with SessionLocal() as db: 
        evt = Event( 
            type=type, 
            user=user, 
            debate_id=debate_id, 
            target_user=target_user, 
            value=value, 
            created_at=created_at or datetime.utcnow(), 
        ) 
        db.add(evt) 
        db.commit() 
        return {"status": "ok", "id": evt.id} 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Metrics: Participación 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
@app.get("/metrics/participation") 
def participation( 
    since: Optional[datetime] = Query(None, description="Filter from 
timestamp (UTC)"), 
    until: Optional[datetime] = Query(None, description="Filter until 
timestamp (UTC)"), 
    format: Literal["json", "csv"] = Query("json"), 
): 
    cached = get_cached("participation", since=since, until=until, 
format=format) 
    if cached and format == "json": 
        resp = JSONResponse(cached) 
        json_cache_headers(resp) 
        return resp 
 
    with SessionLocal() as db: 
        q_base = 
db.query(Event).filter(Event.type.in_(["message_posted", 
"vote_cast"])) 
        if since: 
            q_base = q_base.filter(Event.created_at >= since) 
        if until: 
            q_base = q_base.filter(Event.created_at < until) 
        rows = q_base.all() 
 
    # Aggregations 
    unique_users = len({r.user for r in rows}) 
    posts = sum(1 for r in rows if r.type == "message_posted") 
    votes = sum(1 for r in rows if r.type == "vote_cast") 
 
    per_debate: dict[str, dict] = {} 
    for r in rows: 
        if not r.debate_id: 
            continue 
        bucket = per_debate.setdefault(r.debate_id, {"debate_id": 
r.debate_id, "posts": 0, "votes": 0}) 
        if r.type == "message_posted": 
            bucket["posts"] += 1 
        elif r.type == "vote_cast": 
            bucket["votes"] += 1 
 
    breakdown = sorted(per_debate.values(), key=lambda x: (x["posts"] 
+ x["votes"]), reverse=True) 
 
    data = { 
        "active_users": unique_users, 
        "posts": posts, 
        "votes": votes, 
        "top_debates": breakdown[:10], 
        "generated_at": datetime.utcnow().isoformat() + "Z", 
        "window": { 
            "since": (since or (datetime.utcnow() - 
timedelta(days=7))).isoformat() + "Z", 
            "until": (until or datetime.utcnow()).isoformat() + "Z", 
        }, 
    } 
 
    set_cached("participation", data, since=since, until=until, 
format=format) 
 
    if format == "csv": 
        rows_csv = [{"metric": "active_users", "value": unique_users}, 
                    {"metric": "posts", "value": posts}, 
                    {"metric": "votes", "value": votes}] 
        rows_csv += [{"metric": "debate", "debate_id": x["debate_id"], 
"posts": x["posts"], "votes": x["votes"]} for x in breakdown] 
        return csv_response(rows_csv, filename="participation.csv") 
 
    resp = JSONResponse(data) 
    json_cache_headers(resp) 
    return resp 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Metrics: Tiempos (latencias) 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
@app.get("/metrics/times") 
def times( 
    since: Optional[datetime] = Query(None), 
    until: Optional[datetime] = Query(None), 
    format: Literal["json", "csv"] = Query("json"), 
): 
    cached = get_cached("times", since=since, until=until, 
format=format) 
    if cached and format == "json": 
        resp = JSONResponse(cached) 
        json_cache_headers(resp) 
        return resp 
 
    with SessionLocal() as db: 
        q = db.query(Event).filter(Event.type == 
"first_response_latency") 
        if since: 
            q = q.filter(Event.created_at >= since) 
        if until: 
            q = q.filter(Event.created_at < until) 
        latencies = [e.value for e in q.all() if e.value is not None] 
 
    cnt = len(latencies) 
    avg = sum(latencies) / cnt if cnt else 0.0 
    p50 = sorted(latencies)[int(0.5 * cnt)] if cnt else 0.0 
    p90 = sorted(latencies)[int(0.9 * cnt)] if cnt else 0.0 
 
    data = { 
        "count": cnt, 
        "avg_first_response_seconds": round(avg, 3), 
        "p50_seconds": round(p50, 3), 
        "p90_seconds": round(p90, 3), 
        "generated_at": datetime.utcnow().isoformat() + "Z", 
        "window": { 
            "since": (since or (datetime.utcnow() - 
timedelta(days=7))).isoformat() + "Z", 
            "until": (until or datetime.utcnow()).isoformat() + "Z", 
        }, 
    } 
 
    set_cached("times", data, since=since, until=until, format=format) 
 
    if format == "csv": 
        rows_csv = [ 
            {"metric": "count", "value": cnt}, 
            {"metric": "avg_first_response_seconds", "value": 
data["avg_first_response_seconds"]}, 
            {"metric": "p50_seconds", "value": data["p50_seconds"]}, 
            {"metric": "p90_seconds", "value": data["p90_seconds"]}, 
        ] 
        return csv_response(rows_csv, filename="times.csv") 
 
    resp = JSONResponse(data) 
    json_cache_headers(resp) 
    return resp 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Metrics: Delegación 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
@app.get("/metrics/delegation") 
def delegation( 
    since: Optional[datetime] = Query(None), 
    until: Optional[datetime] = Query(None), 
    format: Literal["json", "csv"] = Query("json"), 
): 
    cached = get_cached("delegation", since=since, until=until, 
format=format) 
    if cached and format == "json": 
        resp = JSONResponse(cached) 
        json_cache_headers(resp) 
        return resp 
 
    with SessionLocal() as db: 
        q = db.query(Event).filter(Event.type.in_(["delegated_to", 
"delegation_revoked"])) 
        if since: 
            q = q.filter(Event.created_at >= since) 
        if until: 
            q = q.filter(Event.created_at < until) 
        events = q.all() 
 
    # compute active delegations as (+1 for delegated_to, -1 for 
revoked) 
    active_edges: set[tuple[str, str]] = set() 
    for e in sorted(events, key=lambda x: x.created_at):  # 
chronological 
        edge = (e.user, e.target_user or "") 
        if e.type == "delegated_to": 
            active_edges.add(edge) 
        elif e.type == "delegation_revoked" and edge in active_edges: 
            active_edges.remove(edge) 
 
    # top delegates (in-degree) 
    indeg: dict[str, int] = {} 
    for (_src, dst) in active_edges: 
        indeg[dst] = indeg.get(dst, 0) + 1 
    top_delegates = sorted( 
        [{"user": u, "delegators": c} for u, c in indeg.items()], 
        key=lambda x: x["delegators"], 
        reverse=True, 
    )[:10] 
 
    data = { 
        "active_delegations": len(active_edges), 
        "top_delegates": top_delegates, 
        "generated_at": datetime.utcnow().isoformat() + "Z", 
        "window": { 
            "since": (since or (datetime.utcnow() - 
timedelta(days=30))).isoformat() + "Z", 
            "until": (until or datetime.utcnow()).isoformat() + "Z", 
        }, 
    } 
 
    set_cached("delegation", data, since=since, until=until, 
format=format) 
 
    if format == "csv": 
        rows_csv = [{"metric": "active_delegations", "value": 
len(active_edges)}] 
        rows_csv += [{"metric": "top_delegate", "user": x["user"], 
"delegators": x["delegators"]} for x in top_delegates] 
        return csv_response(rows_csv, filename="delegation.csv") 
 
    resp = JSONResponse(data) 
    json_cache_headers(resp) 
    return resp 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Summary + CSV export 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
@app.get("/metrics/summary") 
def summary( 
    since: Optional[datetime] = Query(None), 
    until: Optional[datetime] = Query(None), 
    format: Literal["json", "csv"] = Query("json"), 
): 
    cached = get_cached("summary", since=since, until=until, 
format=format) 
    if cached and format == "json": 
        resp = JSONResponse(cached) 
        json_cache_headers(resp) 
        return resp 
 
    p = participation(since=since, until=until, format="json") 
    t = times(since=since, until=until, format="json") 
    d = delegation(since=since, until=until, format="json") 
 
    # unwrap JSONResponse bodies 
    p_data = p.body if isinstance(p, JSONResponse) else p 
    t_data = t.body if isinstance(t, JSONResponse) else t 
    d_data = d.body if isinstance(d, JSONResponse) else d 
 
    # JSONResponse.body is bytes in Starlette; decode to dict 
    import json as _json 
    p_dict = _json.loads(p_data) if isinstance(p_data, (bytes, 
bytearray)) else p_data 
    t_dict = _json.loads(t_data) if isinstance(t_data, (bytes, 
bytearray)) else t_data 
    d_dict = _json.loads(d_data) if isinstance(d_data, (bytes, 
bytearray)) else d_data 
 
    data = { 
        "participation": p_dict, 
        "times": t_dict, 
        "delegation": d_dict, 
        "generated_at": datetime.utcnow().isoformat() + "Z", 
    } 
 
    set_cached("summary", data, since=since, until=until, 
format=format) 
 
    if format == "csv": 
        # flatten a useful subset 
        rows_csv = [ 
            {"section": "participation", "metric": "active_users", 
"value": p_dict["active_users"]}, 
            {"section": "participation", "metric": "posts", "value": 
p_dict["posts"]}, 
            {"section": "participation", "metric": "votes", "value": 
p_dict["votes"]}, 
            {"section": "times", "metric": 
"avg_first_response_seconds", "value": 
t_dict["avg_first_response_seconds"]}, 
            {"section": "times", "metric": "p50_seconds", "value": 
t_dict["p50_seconds"]}, 
            {"section": "times", "metric": "p90_seconds", "value": 
t_dict["p90_seconds"]}, 
            {"section": "delegation", "metric": "active_delegations", 
"value": d_dict["active_delegations"]}, 
        ] 
        return csv_response(rows_csv, filename="summary.csv") 
 
    resp = JSONResponse(data) 
    json_cache_headers(resp) 
    return resp 
 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
# Health 
# 
─────────────────────────────────────────────────────────────────────
 ─────────── 
 
@app.get("/health") 
def health(): 
    db_ok = True 
    try: 
        with engine.connect() as conn: 
            conn.execute("SELECT 1") 
    except Exception: 
        db_ok = False 
    deps = {"db": "ok" if db_ok else "fail", "otel": "ok"} 
    res = health_response(deps) 
    if deps["db"] != "ok": 
        res.status_code = 500 
    return res 
 
 
