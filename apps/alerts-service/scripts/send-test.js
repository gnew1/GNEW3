```js 
import fetch from "node-fetch"; 
const BASE = process.env.BASE || "http://localhost:8787"; 
const ev = { 
type: "PROPOSAL_CREATED", 
id: "1234567890", 
proposer: "0xProposer", 
description: "Ejemplo de propuesta", 
block: 1, 
tx: "0xabc" 
}; 
const r = await fetch(`${BASE}/dev/emit`, { method: "POST", headers: { 
"content-type":"application/json" }, body: JSON.stringify(ev) }); 
console.log("sent", await r.text()); 
Operativa y DoD (N16) 
● Backend (@gnew/alerts-service): 
1. Escucha eventos de GnewGovernorTimelocked: ProposalCreated, 
ProposalQueued, ProposalExecuted, ProposalCanceled, VoteCast. 
2. Publica por 3 canales: Webhooks (con firma HMAC y exponential backoff), Web 
Push (W3C, VAPID) y Sockets (tiempo real). 
3. Métricas Prometheus en /metrics + latencia por canal; salud en /healthz. 
4. Persistencia en SQLite (suscriptores + entregas) y deliverability monitorizable: 
objetivo ≥95% (ver métrica 
gnew_alerts_deliveries_total{status="OK"} / total). 
● Frontend web: 
1. Service Worker (/public/sw.js) + NotifyToggle para suscribirse y 
recibir notificaciones. 
2. Sockets conectados y suscritos a rooms por evento (evt:PROPOSAL_CREATED, 
etc.). 
● DevOps: 
1. Despliegue container listo (Dockerfile). Expone :8787. 
2. Variables .env para RPC (WS/HTTP), VAPID_*, WEBHOOK_SECRET. 
● Validación DoD: 
1. Levanta anvil o usa Holesky; configura .env del servicio con 
GOVERNOR_ADDRESS y TIMELOCK_ADDRESS. 
Arranca backend: 
pnpm --filter @gnew/alerts-service dev 
2.  
3. En la web (@gnew/governance-web), define VITE_ALERTS_BASE y pulsa 
Activar notificaciones. 
4. Crea una propuesta desde la UI (N14). Debes ver: 
■ Toast/console por socket inmediato. 
■ Push del navegador (si concediste permiso). 
■ Entregas webhook (si registraste un endpoint). 
Comprueba métricas: 
curl -s http://localhost:8787/metrics | grep 
gnew_alerts_deliveries_total 
5.  La fracción OK / (OK+FAIL) debe ser ≥ 0.95 en ventanas operativas 
(configurable con Prometheus alert). 
¿Quieres que añada un dashboard Grafana preconfigurado (N5) para graficar 
deliverability por canal y alertar si baja de 95% durante 5 minutos? 
Tú dijiste: 
N17 Objetivo: Medir tono del debate. Roles: Data/ML (lead). Stack: Transformers; idioma 
ES/EN. Entregables: servicio sentiment-score + badges en UI. DoD: F1 ≥0.8 en conjunto 
validado. 
ChatGPT Plus 
Pensó durante 41s 
/apps/sentiment-service/requirements.txt 
fastapi==0.112.2 
uvicorn[standard]==0.30.6 
transformers==4.44.2 
torch==2.4.0 
prometheus_client==0.20.0 
pydantic==2.8.2 
/apps/sentiment-service/src/index.py 
# SPDX-License-Identifier: MIT 
# -*- coding: utf-8 -*- 
""" 
Servicio de puntuación de tono (sentiment) ES/EN sobre razones de 
voto/debate. - Modelo por defecto: cardiffnlp/twitter-xlm-roberta-base-sentiment (3 
clases: neg/neu/pos). - Endpoints: 
* POST /score         -> una cadena 
* POST /score/batch   -> lote de textos 
* GET  /healthz       -> salud 
* GET  /metrics       -> métricas Prometheus 
""" 
import os 
import time 
from typing import List, Literal, Optional, Dict 
import torch 
from fastapi import FastAPI 
from pydantic import BaseModel, Field 
from prometheus_client import Counter, Histogram, generate_latest, 
CONTENT_TYPE_LATEST 
from transformers import AutoTokenizer, 
AutoModelForSequenceClassification 
# ---- Config 
MODEL_ID = os.getenv("MODEL_ID", 
"cardiffnlp/twitter-xlm-roberta-base-sentiment") 
DEVICE = "cuda" if torch.cuda.is_available() and os.getenv("GPU", "0") 
== "1" else "cpu" 
# ---- Métricas 
REQS = Counter("gnew_sentiment_requests_total", "Total de peticiones", 
["route"]) 
LAT  = Histogram("gnew_sentiment_latency_ms", "Latencia de inferencia 
(ms)", buckets=(5,10,20,50,100,200,400,800,1500)) 
# ---- Carga de modelo 
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID) 
model = 
AutoModelForSequenceClassification.from_pretrained(MODEL_ID).to(DEVICE
 ) 
model.eval() 
LABELS = {0: "negative", 1: "neutral", 2: "positive"}  # propio del 
modelo de Cardiff 
LABEL_TO_SCORE = {"negative": -1.0, "neutral": 0.0, "positive": 1.0} 
def _preprocess(text: str) -> str: 
    t = text.strip() 
    t = t.replace("\r", " ").replace("\n", " ") 
    # normaliza mentions y URLs mínimamente (mejora robustez de 
modelos twitter) 
    import re 
    t = re.sub(r"https?://\S+", "http", t) 
    t = re.sub(r"@\w+", "@user", t) 
    return t[:1024]  # límite de seguridad 
 
def _softmax(x): 
    import math 
    m = max(x) 
    exps = [math.exp(v - m) for v in x] 
    s = sum(exps) 
    return [e/s for e in exps] 
 
def score_text(text: str) -> Dict: 
    t0 = time.time() 
    with torch.no_grad(): 
        enc = tokenizer(_preprocess(text), return_tensors="pt", 
truncation=True).to(DEVICE) 
        logits = model(**enc).logits.squeeze(0).tolist() 
        probs = _softmax(logits) 
        label_id = int(max(range(len(probs)), key=lambda i: probs[i])) 
        label = LABELS[label_id] 
        conf = float(probs[label_id]) 
        # score continuo [-1,1] como expectativa 
        expected = float(sum(p * LABEL_TO_SCORE[LABELS[i]] for i, p in 
enumerate(probs))) 
    LAT.observe((time.time() - t0) * 1000.0) 
    return {"label": label, "confidence": conf, "scores": {"negative": 
probs[0], "neutral": probs[1], "positive": probs[2]}, "expected": 
expected} 
 
# ---- API 
app = FastAPI(title="GNEW Sentiment Service", version="0.1.0") 
 
class ScoreIn(BaseModel): 
    text: str = Field(..., min_length=1, max_length=4000) 
    lang: Optional[Literal["es","en"]] = None 
 
class ScoreOut(BaseModel): 
    label: Literal["negative","neutral","positive"] 
    confidence: float 
    expected: float 
    scores: Dict[str, float] 
    model: str = Field(default=MODEL_ID) 
 
class BatchItem(BaseModel): 
    id: str 
    text: str 
 
class BatchIn(BaseModel): 
    items: List[BatchItem] 
 
class BatchOutItem(BaseModel): 
    id: str 
    label: str 
    confidence: float 
    expected: float 
 
@app.get("/healthz") 
def healthz(): 
    REQS.labels("/healthz").inc() 
    return {"ok": True, "model": MODEL_ID, "device": DEVICE} 
 
@app.get("/metrics") 
def metrics(): 
    return generate_latest(), 200, {"Content-Type": 
CONTENT_TYPE_LATEST} 
 
@app.post("/score", response_model=ScoreOut) 
def score(payload: ScoreIn): 
    REQS.labels("/score").inc() 
    s = score_text(payload.text) 
    s["model"] = MODEL_ID 
return s 
@app.post("/score/batch", response_model=List[BatchOutItem]) 
def score_batch(payload: BatchIn): 
REQS.labels("/score/batch").inc() 
out: List[BatchOutItem] = [] 
for it in payload.items: 
s = score_text(it.text) 
out.append(BatchOutItem(id=it.id, label=s["label"], 
confidence=s["confidence"], expected=s["expected"])) 
return out 
if __name__ == "__main__": 
import uvicorn 
uvicorn.run("index:app", host="0.0.0.0", 
port=int(os.getenv("PORT", "8890")), reload=True) 
/apps/sentiment-service/Dockerfile 
FROM python:3.11-slim AS base 
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 
RUN apt-get update && apt-get install -y --no-install-recommends git 
&& rm -rf /var/lib/apt/lists/* 
WORKDIR /svc 
COPY requirements.txt . 
RUN pip install -r requirements.txt 
COPY src ./src 
EXPOSE 8890 
CMD 
["python","-m","uvicorn","src.index:app","--host","0.0.0.0","--port","
 8890"] 
/apps/sentiment-service/README.md 
# @gnew/sentiment-service (N17) 
Servicio **Transformers** para medir el **tono del debate** (ES/EN) 
sobre razones de voto y comentarios. 
- Modelo por defecto: `cardiffnlp/twitter-xlm-roberta-base-sentiment` 
(3 clases). - Endpoints: `POST /score`, `POST /score/batch`, `GET /metrics`, `GET 
/healthz`. - Dev/Run: 
```bash 
uvicorn src.index:app --host 0.0.0.0 --port 8890 
# o via Docker 
docker build -t gnew/sentiment . 
docker run -p 8890:8890 gnew/sentiment 
Evaluación (F1): 
python scripts/evaluate.py --dataset data/val.csv  # columnas: 
text,label (negative|neutral|positive) 
●  Meta DoD: Macro‑F1 ≥ 0.80 en el conjunto validado. 
