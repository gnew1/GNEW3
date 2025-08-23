import json 
from typing import List, Optional 
from fastapi import FastAPI, Depends, HTTPException 
from fastapi.responses import JSONResponse 
from starlette.middleware import Middleware 
from prometheus_client import Counter, Histogram, Gauge, 
generate_latest, CONTENT_TYPE_LATEST 
from sqlmodel import Session, select 
from services.common.middleware import LoggingMiddleware, 
ExceptionMiddleware 
from services.common.otel import setup_otel 
from .config import settings 
from .models import init_db, engine, Thread, Message, Summary, 
Feedback, latest_summary 
from .pipelines import summarize, topic_tags, extract_agenda, 
rank_passages, qa_answer 
from .pipelines import _embed_sentences  # dim discovery 
from .store import VectorStore 
middleware = [ 
    Middleware(LoggingMiddleware), 
    Middleware(ExceptionMiddleware), 
] 
app = FastAPI(title="Debate Assistant", middleware=middleware) 
setup_otel(settings.service_name, app) 
 
# Métricas 
FEEDBACK = Counter("debate_feedback_total", "Feedback recibido (por 
score)", ["score"]) 
SUMMARIZE_H = Histogram("debate_summarize_seconds", "Duración de 
resumido") 
ASSIST_OK = Gauge("debate_assistant_up", "Servicio OK") 
 
# Vector store en memoria por hilo 
_STORES: dict[int, VectorStore] = {} 
_DIM = 384  # valor por defecto; se ajusta en _ensure_store 
 
def _ensure_store(thread_id: int) -> VectorStore: 
    global _DIM 
    if thread_id not in _STORES: 
        # detectar dim real si backends avanzados 
        try: 
            _DIM = _embed_sentences(["dim-probe"]).shape[1] 
        except Exception: 
            _DIM = 384 
        _STORES[thread_id] = VectorStore(_DIM) 
    return _STORES[thread_id] 
 
@app.on_event("startup") 
async def startup(): 
    init_db() 
    ASSIST_OK.set(1) 
 
@app.get("/healthz") 
async def healthz(): 
    # DB probe 
    ok = True 
    try: 
        with Session(engine) as sess: 
            sess.exec(select(Thread).limit(1)).first() 
    except Exception: 
        ok = False 
    status = "ok" if ok else "error" 
    return JSONResponse(status_code=200 if ok else 500, 
content={"status": status, "model": "local", "env": 
settings.environment}) 
 
# --------- Ingesta --------- 
class IngestPayload(Thread, table=False):  # tipo pydantic 
    messages: List[dict] 
 
@app.post("/ingest") 
async def ingest(payload: IngestPayload): 
    if not payload.ext_id or not payload.title: 
        raise HTTPException(status_code=400, detail="ext_id y title 
requeridos") 
    with Session(engine) as sess: 
        th = sess.exec(select(Thread).where(Thread.ext_id == 
payload.ext_id)).first() 
        if not th: 
            th = Thread(ext_id=payload.ext_id, title=payload.title) 
            sess.add(th) 
            sess.commit() 
            sess.refresh(th) 
        # insertar mensajes nuevos 
        new_texts = [] 
        new_payloads = [] 
        for m in payload.messages: 
            text = (m.get("text") or "").strip() 
            if not text: 
                continue 
            msg = Message(thread_id=th.id, author=m.get("author", 
"anon"), text=text) 
            sess.add(msg) 
            sess.commit() 
            sess.refresh(msg) 
            new_texts.append(text) 
            new_payloads.append({"id": msg.id, "author": msg.author, 
"thread_id": th.id, "text": text}) 
        # actualizar índice 
        if new_texts: 
            store = _ensure_store(th.id) 
            embs = _embed_sentences(new_texts) 
            store.add(embs, new_payloads) 
        return {"thread_id": th.id, "added": len(new_texts)} 
 
# --------- Panel (TL;DR + argumentos) --------- 
@app.get("/panel/{thread_id}") 
async def panel(thread_id: int, k: int = 6): 
    with Session(engine) as sess: 
        th = sess.get(Thread, thread_id) 
        if not th: 
            raise HTTPException(status_code=404, detail="thread not 
found") 
        msgs = sess.exec(select(Message).where(Message.thread_id == 
thread_id).order_by(Message.ts)).all() 
        corpus = [m.text for m in msgs] 
        if not corpus: 
            return {"thread_id": thread_id, "tldr": "", 
"key_arguments": [], "tags": [], "agenda": [], "sources": []} 
        with SUMMARIZE_H.time(): 
            tldr = summarize(" ".join(corpus)) 
        # Argumentos clave = pasajes mejor rankeados por 
representatividad del TL;DR 
        top_passages = rank_passages(tldr, corpus, top_k=min(k, 
len(corpus))) 
        key_args = top_passages[:min(len(top_passages), 5)] 
        tags = topic_tags(corpus, topic_k=settings.topic_k) 
        agenda = extract_agenda(corpus) 
        # persistir snapshot del panel 
        snap = Summary( 
            thread_id=thread_id, 
            tldr=tldr, 
            key_arguments=json.dumps(key_args, ensure_ascii=False), 
            tags=json.dumps(tags, ensure_ascii=False), 
            agenda=json.dumps(agenda, ensure_ascii=False), 
        ) 
        sess.add(snap) 
        sess.commit() 
        return { 
            "thread_id": thread_id, 
            "title": th.title, 
            "tldr": tldr, 
            "key_arguments": key_args, 
            "tags": tags, 
            "agenda": agenda, 
            "sources": key_args, 
        } 
 
# --------- QA extractiva (RAG) --------- 
@app.post("/qa") 
async def qa(payload: dict): 
    thread_id = payload.get("thread_id") 
    question = (payload.get("question") or "").strip() 
    if not thread_id or not question: 
        raise HTTPException(status_code=400, detail="thread_id y 
question requeridos") 
    with Session(engine) as sess: 
        msgs = sess.exec(select(Message).where(Message.thread_id == 
thread_id).order_by(Message.ts.desc()).limit(500)).all() 
        corpus = [m.text for m in msgs] 
    # recuperar y responder 
    ctx = rank_passages(question, corpus, 
top_k=settings.top_k_passages) 
    answer, sources = qa_answer(question, ctx) 
    return {"answer": answer, "sources": sources} 
 
# --------- Feedback / DoD --------- 
@app.post("/feedback") 
async def feedback(payload: dict): 
    thread_id = payload.get("thread_id") 
    score = int(payload.get("score", 0)) 
    if not thread_id or not (1 <= score <= 5): 
        raise HTTPException(status_code=400, detail="thread_id y score 
[1..5] requeridos") 
    FEEDBACK.labels(score=str(score)).inc() 
    with Session(engine) as sess: 
        sess.add(Feedback(thread_id=thread_id, score=score)) 
        sess.commit() 
        # calcular precisión percibida (>=4 se considera "positivo") 
        rows = sess.exec(select(Feedback).where(Feedback.thread_id == 
thread_id)).all() 
        pos = sum(1 for r in rows if r.score >= 4) 
        ratio = (pos / len(rows)) * 100 if rows else 0.0 
    return {"ok": True, "perceived_accuracy_pct": round(ratio, 2), 
"target_met": ratio >= 80.0} 
 
@app.get("/metrics") 
async def metrics(): 
    data = generate_latest() 
    return JSONResponse(content=data.decode("utf-8"), 
media_type=CONTENT_TYPE_LATEST) 
 
# --------- Utilidad: último panel --------- 
@app.get("/panel/{thread_id}/latest") 
async def panel_latest(thread_id: int): 
    with Session(engine) as sess: 
        snap = latest_summary(sess, thread_id) 
        if not snap: 
            raise HTTPException(status_code=404, detail="sin 
snapshot") 
        return { 
            "tldr": snap.tldr, 
            "key_arguments": json.loads(snap.key_arguments), 
            "tags": json.loads(snap.tags), 
            "agenda": json.loads(snap.agenda), 
            "created_at": snap.created_at.isoformat(), 
        } 
 
 
