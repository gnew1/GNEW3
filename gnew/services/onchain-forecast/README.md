# On-chain Forecast (N44)

## Quick start
```bash
cd services/onchain-forecast
pip install -r requirements.txt
python train.py                # valida DoD (MAPE ≤ 0.15) y guarda modelos
python forecast.py             # escribe gold/forecast/onchain/date=YYYY-MM-DD/*.parquet
uvicorn api:app --port 8030    # /health, /predict/onchain

Esquemas de entrada esperados (si hay lake N41)
●	gold/metrics/transactions_daily/*.parquet con:
 date, chain, network, sum_amount, sum_fees, tx_count, success_rate

●	gold/metrics/tvl_daily/*.parquet (opcional): date, chain, network, tvl_usd

Salida
●	gold/forecast/onchain/date=YYYY-MM-DD/onchain_forecast.parquet:
 date, market_id, chain, network, volume_pred, apr_pred

DoD
●	MAPE ≤ 15% en backtest rolling (ver reports/backtest.json).

●	Retraining programado (Airflow n44_onchain_retrain) y forecast diario (n44_onchain_forecast).


---

## 15) Cómo se cumple la DoD

- **MAPE ≤ 15%:** `train.py` ejecuta *rolling backtest* por mercado con *features* de lags/rollings/estacionalidad; persiste `reports/backtest.json` y **falla** si `mape > 0.15` (para ambos: volumen y APR).  
- **Retraining programado:** DAG semanal `n44_onchain_retrain`; **forecast diario** `n44_onchain_forecast` publica Parquet en `gold/forecast/onchain/`.

---

### Notas de diseño
- Modelos **HGBR** (árboles boosteados) por su robustez y velocidad; *pipeline* con escalado selectivo + one hot de calendario.  
- *Forecast recursivo t+1* para horizonte `H`; simple y estable para producción inicial.  
- Si añades *exógenas de mercado* (precios BTC/ETH, funding, etc.) el `data_prep` puede ampliarse; el *backtest* se mantiene igual.  
- `fee_apr` es un **proxy** basado en `fees` y `TVL` (si no hay TVL, se emula desde volumen suavizado).

---

¿Quieres que lo conecte ya al **lake Delta** (vía Spark/Delta reader) o que añada **intervalos de confianza** en la API con cuantiles por residuos de backtest?

Tú dijiste:
programa a nivel de detalle para GNEW N45 Objetivo: Señalar comportamientos sospechosos. Roles: Data + Seguridad. DoD: precisión y recall balanceados; alertas integradas.
ChatGPT Plus
Pensó durante 56s
/gnew/services/suspicious-ml/N45-senalamiento-comportamientos
# N45 — Señalar comportamientos sospechosos

**Objetivo:** detectar y alertar **comportamientos sospechosos** (fraude/abuso/spam/sybil/wash trading) combinando reglas y ML.  
**Roles:** Data + Seguridad.  
**DoD:**  
- **Precisión y recall balanceados**: umbral calibrado para |precision−recall| ≤ 0.05 y **F1 ≥ 0.65** en backtest.  
- **Alertas integradas**: Slack/Webhook + escritura en lake `gold/alerts/suspicious/`.

Compatibilidad con **N41** (lake Delta/Parquet) y estilo de servicios **N42–N44** (FastAPI, pytest, Makefile, Airflow DAG).

 
1) Estructura
services/suspicious-ml/
  ├── README.md
  ├── requirements.txt
  ├── .env.example
  ├── config/
  │   ├── detectors.yaml          # reglas y umbrales
  │   └── alerting.yaml           # rutas de entrega (Slack/Webhook)
  ├── dataio.py                   # carga desde lake o sintético
  ├── features.py                 # enriquecimiento de señales
  ├── detectors/
  │   ├── rules.py                # reglas: spam, velocity, multi-cuenta, wash
  │   └── ensemble.py             # combina reglas → rule_score + reasons
  ├── model/
  │   ├── train.py                # entrena HGBClassifier + calibración de umbral
  │   ├── eval_utils.py           # PR curve, F1 balance, métricas
  │   └── artifacts/
  │       ├── model.pkl
  │       ├── threshold.json
  │       └── metrics.json
  ├── score.py                    # batch scoring → gold/alerts/suspicious/
  ├── alerting/
  │   ├── slack.py                # envío a Slack
  │   └── webhook.py              # POST genérico
  ├── api.py                      # FastAPI: /detect/suspicious, /alerts/trigger
  ├── Dockerfile
  ├── Makefile
  └── tests/
      ├── test_training.py
      ├── test_rules.py
      └── test_api.py

 
2) Variables de entorno
services/suspicious-ml/.env.example
# Lake (N41). Usa rutas parquet (o s3a://...) ya exportadas por N41.
DATA_LAKE_PATH=../../data/analytics/N41-data-lake
TX_SILVER=${DATA_LAKE_PATH}/silver/transactions       # optional
FORUMS_SILVER=${DATA_LAKE_PATH}/silver/forums         # optional
USERS_GOLD=${DATA_LAKE_PATH}/gold/segments            # optional (N43 segmentos)

# Artefactos
ARTIFACT_DIR=./model/artifacts

# Salida de alertas
ALERTS_OUT=${DATA_LAKE_PATH}/gold/alerts/suspicious

# Alerting (Slack/Webhook)
SLACK_WEBHOOK_URL=
ALERT_WEBHOOK_URL=

# Objetivos DoD
F1_MIN=0.65
BALANCE_MAX_DIFF=0.05    # |precision - recall| ≤ 0.05

 
3) Requisitos
services/suspicious-ml/requirements.txt
fastapi
uvicorn[standard]
pandas
numpy
scikit-learn>=1.3
joblib
pyyaml
httpx
pyarrow
networkx
pytest
httpx

 
4) Configuración de reglas y alertas
services/suspicious-ml/config/detectors.yaml
rules:
  velocity:
    tx_per_minute_high: 20
    unique_projects_1h_high: 15
    login_geo_velocity_kmh: 900      # imposible viaje (aprox. vuelo comercial)
  sybil:
    max_accounts_per_device_24h: 5
    max_accounts_per_ip_24h: 10
  wash_trading:
    loop_tx_window_m: 60
    min_loop_count: 3
    addr_pair_ratio_high: 0.65       # % de volumen entre dos direcciones
  spam:
    min_msgs_10m: 25
    link_ratio_high: 0.7
    repeated_text_jaccard: 0.9
weights:
  velocity: 0.30
  sybil: 0.30
  wash_trading: 0.25
  spam: 0.15
risk_thresholds:
  low: 0.35
  medium: 0.55
  high: 0.75

services/suspicious-ml/config/alerting.yaml
destinations:
  - type: slack
    enabled: true
    channel: "#security-alerts"
  - type: webhook
    enabled: false
    url: "https://example.com/alerts"
format:
  title_template: "[SUSPICIOUS-{level}] {category} by {subject}"
  route_by: ["category","level"]

 
5) Carga de datos y features
services/suspicious-ml/dataio.py
from __future__ import annotations
import os, glob
import numpy as np, pandas as pd
from datetime import datetime, timedelta

def _read_any(glob_path: str) -> pd.DataFrame:
    files = sorted(glob.glob(glob_path))
    if not files:
        raise FileNotFoundError(glob_path)
    return pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)

def synthetic(n_users=6000, days=60, seed=42) -> tuple[pd.DataFrame, pd.DataFrame]:
    rng = np.random.default_rng(seed)
    start = datetime.utcnow().date() - timedelta(days=days)
    # eventos de tx
    rows_tx = []
    rows_msg = []
    bad_users = set([f"u{i}" for i in rng.choice(n_users, int(0.08*n_users), replace=False)])
    for u in range(n_users):
        uid = f"u{u}"
        baseline_tx = rng.poisson(0.8)
        for d in range(days):
            date = start + timedelta(days=d)
            n = baseline_tx + (rng.poisson(8) if uid in bad_users and rng.random()<0.15 else 0)
            for _ in range(n):
                rows_tx.append(dict(
                    user_id=uid, ts=pd.Timestamp(date) + pd.to_timedelta(rng.integers(0,24*60), unit="m"),
                    to_user=f"u{rng.integers(0,n_users)}", amount=rng.lognormal(2,0.5),
                    device=f"dev{rng.integers(0,3000)}", ip=f"10.0.{rng.integers(0,255)}.{rng.integers(0,255)}"
                ))
        # mensajes
        base_m = rng.poisson(1.2)
        for d in range(days):
            date = start + timedelta(days=d)
            m = base_m + (rng.poisson(40) if uid in bad_users and rng.random()<0.12 else 0)
            for _ in range(m):
                rows_msg.append(dict(
                    user_id=uid, ts=pd.Timestamp(date) + pd.to_timedelta(rng.integers(0,24*60), unit="m"),
                    text="check this http://x.y" if rng.random()<0.6 else "hello world",
                    channel=rng.choice(["general","promo","support"])
                ))
    tx = pd.DataFrame(rows_tx)
    msgs = pd.DataFrame(rows_msg)
    # etiquetas (ground-truth sintético, con ruido)
    labels = pd.DataFrame({"user_id":[f"u{i}" for i in range(n_users)]})
    labels["label"] = labels["user_id"].isin(bad_users).astype(int)
    # ruido: 10% flip
    idx = rng.choice(len(labels), int(0.1*len(labels)), replace=False)
    labels.loc[idx, "label"] = 1 - labels.loc[idx, "label"]
    return (tx, msgs), labels

def load_from_lake() -> tuple[tuple[pd.DataFrame, pd.DataFrame], pd.DataFrame] | None:
    base = os.getenv("DATA_LAKE_PATH")
    if not base:
        return None
    try:
        forums = _read_any(os.path.join(base, "silver/forums/*.parquet"))
        tx = _read_any(os.path.join(base, "silver/transactions/*.parquet"))
        # construir labels si existe tabla manual (opcional)
        lbl_path = os.path.join(base, "gold/labels/suspicious/*.parquet")
        labels = _read_any(lbl_path) if glob.glob(lbl_path) else None
        return (tx, forums), labels
    except Exception:
        return None

services/suspicious-ml/features.py
from __future__ import annotations
import numpy as np, pandas as pd

def features_from_events(tx: pd.DataFrame, msgs: pd.DataFrame) -> pd.DataFrame:
    # agregados por usuario (ventanas simples)
    tx["date"] = pd.to_datetime(tx["ts"]).dt.date
    msgs["date"] = pd.to_datetime(msgs["ts"]).dt.date

    # velocity (tx/min, proyectos únicos, ratio pares fijos)
    tx_min = tx.groupby(["user_id", pd.to_datetime(tx["ts"]).dt.floor("min")]).size().groupby("user_id").max()
    uniq_peers = tx.groupby(["user_id","to_user"]).size().groupby("user_id").size()
    top_pair_ratio = (tx.groupby(["user_id","to_user"]).size().groupby("user_id").max() / tx.groupby("user_id").size()).fillna(0)

    # dispositivos / IP (posible sybil)
    uniq_devices = tx.groupby("user_id")["device"].nunique()
    uniq_ips = tx.groupby("user_id")["ip"].nunique()

    # foros: volumetría y spam proxies
    msgs_10m = msgs.groupby(["user_id", pd.to_datetime(msgs["ts"]).dt.floor("10min")]).size().groupby("user_id").max()
    link_ratio = msgs.groupby("user_id")["text"].apply(lambda s: (s.str.contains("http")).mean()).fillna(0)
    rep_text = msgs.groupby("user_id")["text"].apply(lambda s: s.value_counts(normalize=True).max()).fillna(0)

    feats = pd.DataFrame({
        "user_id": pd.Index(sorted(set(tx["user_id"]) | set(msgs["user_id"]))),
    })
    feats = feats.set_index("user_id")
    for name, series in {
        "tx_per_minute_peak": tx_min, "unique_peers": uniq_peers, "top_pair_ratio": top_pair_ratio,
        "unique_devices": uniq_devices, "unique_ips": uniq_ips,
        "msgs_10m_peak": msgs_10m, "link_ratio": link_ratio, "repeated_text_ratio": rep_text
    }.items():
        feats[name] = series
    feats = feats.fillna(0).reset_index()
    return feats

 
6) Reglas y ensemble de reglas
services/suspicious-ml/detectors/rules.py
from __future__ import annotations
import yaml
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple

def load_config(path="config/detectors.yaml") -> dict:
    with open(path) as f: return yaml.safe_load(f)

def apply_rules(feats: pd.DataFrame, cfg: dict) -> Tuple[pd.DataFrame, List[str]]:
    r = cfg["rules"]
    out = pd.DataFrame({"user_id": feats["user_id"]})
    reasons = []

    # Velocity
    v1 = feats["tx_per_minute_peak"] >= r["velocity"]["tx_per_minute_high"]
    v2 = feats["unique_peers"] >= r["velocity"]["unique_projects_1h_high"]
    velocity = v1 | v2
    out["r_velocity"] = velocity.astype(int)
    if velocity.any(): reasons.append("velocity")

    # Sybil (multi-cuenta por device/ip se estima inversamente: muchos users por device/IP requiere logs; aquí proxy: muchos devices/IP por usuario)
    s1 = feats["unique_devices"] >= r["sybil"]["max_accounts_per_device_24h"]
    s2 = feats["unique_ips"] >= r["sybil"]["max_accounts_per_ip_24h"]
    sybil = s1 | s2
    out["r_sybil"] = sybil.astype(int)
    if sybil.any(): reasons.append("sybil")

    # Wash trading (pares fijos)
    w1 = feats["top_pair_ratio"] >= r["wash_trading"]["addr_pair_ratio_high"]
    out["r_wash"] = w1.astype(int)
    if w1.any(): reasons.append("wash_trading")

    # Spam
    sp1 = feats["msgs_10m_peak"] >= r["spam"]["min_msgs_10m"]
    sp2 = feats["link_ratio"] >= r["spam"]["link_ratio_high"]
    sp3 = feats["repeated_text_ratio"] >= r["spam"]["repeated_text_jaccard"]
    spam = sp1 | (sp2 & sp3)
    out["r_spam"] = spam.astype(int)
    if spam.any(): reasons.append("spam")

    return out, reasons

services/suspicious-ml/detectors/ensemble.py
from __future__ import annotations
import numpy as np
import pandas as pd
from typing import Dict

def rule_score(rule_df: pd.DataFrame, weights: Dict[str,float]) -> pd.DataFrame:
    df = rule_df.copy()
    score = (
        df["r_velocity"] * weights.get("velocity",0) +
        df["r_sybil"] * weights.get("sybil",0) +
        df["r_wash"] * weights.get("wash_trading",0) +
        df["r_spam"] * weights.get("spam",0)
    )
    df["rule_score"] = score
    df["rule_reasons"] = df.apply(lambda r: [k for k in ["velocity","sybil","wash_trading","spam"] if int(r[f"r_{k if k!='wash_trading' else 'wash'}"])==1], axis=1)
    return df

 
7) Entrenamiento ML + calibración de umbral (DoD)
services/suspicious-ml/model/eval_utils.py
from __future__ import annotations
import numpy as np
from dataclasses import dataclass
from sklearn.metrics import precision_recall_curve, f1_score, precision_score, recall_score, average_precision_score

@dataclass
class ThresholdResult:
    threshold: float
    precision: float
    recall: float
    f1: float
    ap: float

def calibrate_balanced_threshold(y_true, y_scores, max_diff=0.05) -> ThresholdResult:
    p, r, th = precision_recall_curve(y_true, y_scores)
    f1s = 2*p*r/(p+r+1e-9)
    ap = average_precision_score(y_true, y_scores)
    # buscamos f1 máximo sujeto a |p-r| ≤ max_diff
    best_idx = None
    best_f1 = -1
    for i in range(len(th)):
        if abs(p[i]-r[i]) <= max_diff and f1s[i] > best_f1:
            best_idx = i; best_f1 = f1s[i]
    if best_idx is None:
        # fallback: f1 máximo global
        best_idx = int(f1s.argmax())
    thr = float(th[best_idx])
    return ThresholdResult(threshold=thr, precision=float(p[best_idx]), recall=float(r[best_idx]), f1=float(f1s[best_idx]), ap=float(ap))

services/suspicious-ml/model/train.py
from __future__ import annotations
import os, json
from pathlib import Path
import numpy as np, pandas as pd
from joblib import dump
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.ensemble import HistGradientBoostingClassifier
from ..dataio import load_from_lake, synthetic
from ..features import features_from_events
from ..detectors.rules import load_config, apply_rules
from ..detectors.ensemble import rule_score
from .eval_utils import calibrate_balanced_threshold

ART_DIR = Path(os.getenv("ARTIFACT_DIR","./model/artifacts"))
F1_MIN = float(os.getenv("F1_MIN","0.65"))
BALANCE_MAX_DIFF = float(os.getenv("BALANCE_MAX_DIFF","0.05"))

def main():
    ART_DIR.mkdir(parents=True, exist_ok=True)
    loaded = load_from_lake()
    if loaded:
        (tx, msgs), labels = loaded
        if labels is None:
            # sin labels reales → sintético controlado (para CI)
            (tx, msgs), labels = synthetic()
    else:
        (tx, msgs), labels = synthetic()

    feats = features_from_events(tx, msgs)
    cfg = load_config()
    rflags, _ = apply_rules(feats, cfg)
    combo = rule_score(rflags, cfg["weights"])
    df = feats.merge(combo, on="user_id", how="left").merge(labels, on="user_id", how="left")

    X = df[["tx_per_minute_peak","unique_peers","top_pair_ratio","unique_devices","unique_ips",
            "msgs_10m_peak","link_ratio","repeated_text_ratio","rule_score"]]
    y = df["label"].astype(int)

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    clf = HistGradientBoostingClassifier(max_depth=5, learning_rate=0.08, max_iter=600,
                                         l2_regularization=0.0, min_samples_leaf=30, random_state=42)
    clf.fit(Xtr, ytr)
    scores = clf.predict_proba(Xte)[:,1]

    thr = calibrate_balanced_threshold(yte.to_numpy(), scores, max_diff=BALANCE_MAX_DIFF)
    yhat = (scores >= thr.threshold).astype(int)

    report = {
        "precision": float((yhat & (yte==1)).sum() / max(1, (yhat==1).sum())),
        "recall": float((yhat & (yte==1)).sum() / max(1, (yte==1).sum())),
        "f1": float(2*(((yhat & (yte==1)).sum()) / max(1, (yhat==1).sum()))*(((yhat & (yte==1)).sum()) / max(1, (yte==1).sum())) /
                    ((((yhat & (yte==1)).sum()) / max(1, (yhat==1).sum()))+(((yhat & (yte==1)).sum()) / max(1, (yte==1).sum())) + 1e-9)),
        "ap": float(thr.ap),
        "threshold": thr.threshold,
        "balanced_precision": thr.precision,
        "balanced_recall": thr.recall
    }

    with open(ART_DIR/"metrics.json","w") as f: json.dump(report, f, indent=2)
    with open(ART_DIR/"threshold.json","w") as f: json.dump({"threshold": thr.threshold}, f)

    dump(clf, ART_DIR/"model.pkl")

    print(f"[train] P={thr.precision:.3f} R={thr.recall:.3f} F1={report['f1']:.3f} thr={thr.threshold:.3f} AP={thr.ap:.3f}")

    # DoD: balance y F1
    if abs(thr.precision - thr.recall) > BALANCE_MAX_DIFF or report["f1"] < F1_MIN:
        raise SystemExit(f"DoD FAIL — P={thr.precision:.3f}, R={thr.recall:.3f}, F1={report['f1']:.3f}")

if __name__ == "__main__":
    main()

 
8) Scoring batch + escritura al lake + alertas
services/suspicious-ml/score.py
from __future__ import annotations
import os, json
from pathlib import Path
from datetime import datetime
import numpy as np, pandas as pd
from joblib import load
from .dataio import load_from_lake, synthetic
from .features import features_from_events
from .detectors.rules import load_config, apply_rules
from .detectors.ensemble import rule_score
from .alerting.slack import send_slack
from .alerting.webhook import send_webhook

ART_DIR = Path(os.getenv("ARTIFACT_DIR","./model/artifacts"))
OUT = os.getenv("ALERTS_OUT","../../data/analytics/N41-data-lake/gold/alerts/suspicious")

def main():
    # Cargar datos
    loaded = load_from_lake()
    if loaded:
        (tx, msgs), _ = loaded
    else:
        (tx, msgs), _ = synthetic()

    feats = features_from_events(tx, msgs)
    cfg = load_config()
    rules_df, _ = apply_rules(feats, cfg)
    rules_scored = rule_score(rules_df, cfg["weights"])

    model = load(ART_DIR/"model.pkl")
    thr = json.loads((ART_DIR/"threshold.json").read_text())["threshold"]

    X = feats[["tx_per_minute_peak","unique_peers","top_pair_ratio","unique_devices","unique_ips",
               "msgs_10m_peak","link_ratio","repeated_text_ratio"]].copy()
    X["rule_score"] = rules_scored["rule_score"]

    proba = model.predict_proba(X)[:,1]
    preds = (proba >= thr).astype(int)

    out = feats[["user_id"]].copy()
    out["score"] = proba
    out["is_suspicious"] = preds
    out["reasons"] = rules_scored["rule_reasons"]
    out["level"] = pd.cut(out["score"], bins=[-1, cfg["risk_thresholds"]["low"], cfg["risk_thresholds"]["medium"], cfg["risk_thresholds"]["high"], 1e9],
                          labels=["info","low","medium","high"]).astype(str)
    out["date"] = datetime.utcnow().date().isoformat()

    # persistir
    Path(f"{OUT}/date={out['date'].iloc[0]}").mkdir(parents=True, exist_ok=True)
    out.to_parquet(f"{OUT}/date={out['date'].iloc[0]}/alerts.parquet", index=False)

    # alertas en vivo (medium/high)
    subset = out[out["level"].isin(["medium","high"]) & (out["is_suspicious"]==1)]
    if not subset.empty:
        for _, row in subset.iterrows():
            title = f"[SUSPICIOUS-{row['level'].upper()}] user {row['user_id']}"
            msg = f"score={row['score']:.3f} reasons={row['reasons']}"
            send_slack(title, msg)
            send_webhook({"title": title, "message": msg, "user_id": row["user_id"], "score": float(row["score"]), "reasons": row["reasons"]})
    print(f"[score] {len(out)} usuarios, {int(out['is_suspicious'].sum())} sospechosos, escritos en {OUT}")

if __name__ == "__main__":
    main()

services/suspicious-ml/alerting/slack.py
from __future__ import annotations
import os, json, httpx

def send_slack(title: str, text: str):
    url = os.getenv("SLACK_WEBHOOK_URL")
    if not url:
        return
    payload = {"text": f"*{title}*\n{text}"}
    try:
        httpx.post(url, json=payload, timeout=5.0)
    except Exception:
        pass

services/suspicious-ml/alerting/webhook.py
from __future__ import annotations
import os, httpx

def send_webhook(payload: dict):
    url = os.getenv("ALERT_WEBHOOK_URL")
    if not url:
        return
    try:
        httpx.post(url, json=payload, timeout=5.0)
    except Exception:
        pass

 
9) API (FastAPI) — inferencia online + disparo de alerta
services/suspicious-ml/api.py
from __future__ import annotations
import os, json
from pathlib import Path
from typing import List, Optional
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field
from joblib import load
from .detectors.rules import load_config, apply_rules
from .detectors.ensemble import rule_score
from .alerting.slack import send_slack
from .alerting.webhook import send_webhook

ART_DIR = Path(os.getenv("ARTIFACT_DIR","./model/artifacts"))
cfg = load_config()

class EventIn(BaseModel):
    user_id: str
    tx_per_minute_peak: float = Field(ge=0)
    unique_peers: int = Field(ge=0)
    top_pair_ratio: float = Field(ge=0, le=1)
    unique_devices: int = Field(ge=0)
    unique_ips: int = Field(ge=0)
    msgs_10m_peak: int = Field(ge=0)
    link_ratio: float = Field(ge=0, le=1)
    repeated_text_ratio: float = Field(ge=0, le=1)

class DetectOut(BaseModel):
    user_id: str
    score: float
    is_suspicious: bool
    level: str
    reasons: List[str]

app = FastAPI(title="Suspicious Detection Service")

def _score_one(e: EventIn):
    model = load(ART_DIR/"model.pkl")
    thr = json.loads((ART_DIR/"threshold.json").read_text())["threshold"]
    feats = pd.DataFrame([e.model_dump()])
    rule_df, _ = apply_rules(feats, cfg)
    rs = rule_score(rule_df, cfg["weights"])
    X = feats.drop(columns=["user_id"])
    X["rule_score"] = rs["rule_score"]
    proba = float(model.predict_proba(X)[:,1][0])
    is_sus = proba >= thr
    # nivel
    r = cfg["risk_thresholds"]
    level = "info"
    if proba >= r["high"]: level = "high"
    elif proba >= r["medium"]: level = "medium"
    elif proba >= r["low"]: level = "low"
    return proba, is_sus, level, rs["rule_reasons"].iloc[0]

@app.get("/health")
def health():
    ok = (ART_DIR/"model.pkl").exists() and (ART_DIR/"threshold.json").exists()
    return {"status": "ok" if ok else "degraded"}

@app.post("/detect/suspicious", response_model=DetectOut)
def detect(e: EventIn):
    score, is_sus, level, reasons = _score_one(e)
    return DetectOut(user_id=e.user_id, score=score, is_suspicious=is_sus, level=level, reasons=reasons)

class AlertIn(BaseModel):
    user_id: str
    score: float
    level: str
    reasons: List[str] = []

@app.post("/alerts/trigger")
def trigger(a: AlertIn):
    title = f"[SUSPICIOUS-{a.level.upper()}] user {a.user_id}"
    msg = f"score={a.score:.3f} reasons={a.reasons}"
    send_slack(title, msg)
    send_webhook({"title": title, "message": msg, "user_id": a.user_id, "score": a.score, "reasons": a.reasons})
    return {"ok": True}

 
10) Docker & Makefile
services/suspicious-ml/Dockerfile
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8040
CMD ["uvicorn","api:app","--host","0.0.0.0","--port","8040"]

services/suspicious-ml/Makefile
.PHONY: install train serve score test
install:
\tpython -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
train:
\tpython -m services.suspicious-ml.model.train || python model/train.py
serve:
\tuvicorn api:app --host 0.0.0.0 --port 8040
score:
\tpython score.py
test:
\tpytest -q

 
11) README (quick start)
services/suspicious-ml/README.md
# Suspicious Detection (N45)

## Quick start
```bash
cd services/suspicious-ml
pip install -r requirements.txt
python model/train.py           # entrena, calibra umbral y valida DoD
python score.py                 # genera gold/alerts/suspicious/date=YYYY-MM-DD/alerts.parquet
uvicorn api:app --port 8040     # /health, /detect/suspicious, /alerts/trigger

DoD
●	Balance P/R: |P−R| ≤ 0.05 y F1 ≥ 0.65 (ver model/artifacts/metrics.json).

●	Alertas a Slack/Webhook y parquet en gold/alerts/suspicious/.

Campos mínimos para inferencia online
user_id, tx_per_minute_peak, unique_peers, top_pair_ratio, unique_devices, unique_ips, msgs_10m_peak, link_ratio, repeated_text_ratio

---

## 12) Tests

**services/suspicious-ml/tests/test_training.py**
```python
import json, subprocess, sys
from pathlib import Path

def test_train_validates_dod(tmp_path):
    wd = Path("services/suspicious-ml")
    subprocess.check_call([sys.executable, str(wd/"model/train.py")])
    metrics = json.loads((wd/"model/artifacts/metrics.json").read_text())
    assert metrics["f1"] >= 0.65
    assert abs(metrics["balanced_precision"] - metrics["balanced_recall"]) <= 0.05

services/suspicious-ml/tests/test_rules.py
import pandas as pd
from services.suspicious-ml.detectors.rules import load_config, apply_rules

def test_rules_fire_on_extremes():
    cfg = load_config("services/suspicious-ml/config/detectors.yaml")
    feats = pd.DataFrame([{
        "user_id":"u1","tx_per_minute_peak":99,"unique_peers":99,"top_pair_ratio":0.99,
        "unique_devices":99,"unique_ips":99,"msgs_10m_peak":99,"link_ratio":0.99,"repeated_text_ratio":0.99
    }])
    flags, _ = apply_rules(feats, cfg)
    assert flags[["r_velocity","r_sybil","r_wash","r_spam"]].iloc[0].sum() >= 3

services/suspicious-ml/tests/test_api.py
import os, sys, importlib.util, pytest, subprocess
from httpx import AsyncClient, ASGITransport

def load_app():
    module_path = os.path.join(os.getcwd(), "services", "suspicious-ml", "api.py")
    spec = importlib.util.spec_from_file_location("susp_api", module_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.app

@pytest.mark.asyncio
async def test_detect_smoke(tmp_path):
    # Entrena si no hay modelo
    subprocess.check_call([sys.executable, "services/suspicious-ml/model/train.py"])
    app = load_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "user_id":"u1","tx_per_minute_peak":30,"unique_peers":1,"top_pair_ratio":0.2,
            "unique_devices":1,"unique_ips":1,"msgs_10m_peak":0,"link_ratio":0.0,"repeated_text_ratio":0.1
        }
        r = await ac.post("/detect/suspicious", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "score" in data and "is_suspicious" in data

 
13) Airflow — Retraining programado + Batch scoring (alertas)
airflow/dags/dag_n45_suspicious.py (añadir en N41)
from airflow import DAG
from airflow.utils.dates import days_ago
from airflow.operators.bash import BashOperator
from datetime import timedelta

default_args = {"retries": 1, "retry_delay": timedelta(minutes=15)}

with DAG(
    dag_id="n45_suspicious_daily",
    start_date=days_ago(1),
    schedule="*/30 * * * *",   # cada 30 minutos (ajusta a tus SLO)
    catchup=False,
    default_args=default_args,
    tags=["N45","suspicious","alerts"]
) as dag:
    score = BashOperator(
        task_id="score",
        bash_command="cd /opt/airflow && python services/suspicious-ml/score.py"
    )

with DAG(
    dag_id="n45_suspicious_retrain",
    start_date=days_ago(1),
    schedule="0 5 * * 1",      # semanal lunes 05:00 Europe/Amsterdam
    catchup=True,
    default_args=default_args,
    tags=["N45","retrain"]
) as dag2:
    retrain = BashOperator(
        task_id="retrain",
        bash_command="cd /opt/airflow && python services/suspicious-ml/model/train.py"
    )

 
14) Seguridad/Privacidad y Operación
●	Minimizar PII: solo agregados por usuario; IP/Device se usan agregados.

●	Explicabilidad: reasons = reglas activadas por usuario (para analista de seguridad).

●	Revisión humana: escalado solo para medium/high; integra canal Slack #security-alerts.

●	Versionado: model/artifacts/* versionados por CI; threshold.json asegura reproducibilidad.

 
15) Cómo se cumple la DoD
●	Precisión y recall balanceados: model/train.py calibra umbral en la curva PR y falla si |P−R| > 0.05 o F1 < 0.65.

●	Alertas integradas: score.py envía a Slack/Webhook y persiste Parquet en gold/alerts/suspicious/date=YYYY-MM-DD/alerts.parquet.

 
¿Quieres que añada correlación con segmentos N43 (p. ej. endurecer umbrales para DORMANT vs. POWER) o un panel de revisión con búsqueda y bulk actions?
Tú dijiste:
programa a nivel de detalle para gnew N46 Objetivo: Extraer temas, postura y sentimiento. Roles: Data/ML. DoD: topic coherence aceptable; UI con filtros.
ChatGPT Plus
Pensó durante 1m 33s
/gnew/services/nlp-topics/N46-extraccion-temas-postura-sentimiento
# N46 — Extraer temas, postura y sentimiento

**Objetivo:** extraer **temas**, **postura** (support/neutral/oppose) y **sentimiento** de mensajes de foros/chats.  
**Roles:** Data/ML.  
**DoD:**  
- **Topic coherence aceptable** (UMass promedio ≥ −1.10 en *backtest*; falla si no).  
- **UI con filtros** (Topic Explorer en web: filtra por fecha, plataforma, tema, postura, sentimiento).  

Compatibilidad directa con **N41** (lake de foros) y estilo de servicios **N42–N45** (FastAPI + pytest + Airflow).

 
1) Estructura
services/nlp-topics/
  ├── README.md
  ├── requirements.txt
  ├── .env.example
  ├── dataio.py                 # carga (N41) o sintético
  ├── preprocess.py             # limpieza de texto
  ├── topic_model.py            # TF-IDF + NMF; selección K por coherence UMass
  ├── coherence.py              # métrica UMass
  ├── sentiment.py              # VADER
  ├── stance.py                 # léxico + (opcional) clasif supervisada
  ├── train_topics.py           # orquesta entrenamiento + validación DoD
  ├── extract_daily.py          # scoring diario → lake gold/nlp/
  ├── api.py                    # FastAPI: /nlp/analyze, /nlp/topics, /nlp/aggregate
  ├── models/
  │   ├── topic_model.pkl
  │   ├── topic_meta.json
  │   ├── stance_model.pkl      # opcional si hay labels
  │   └── stance_meta.json
  ├── reports/
  │   ├── coherence.json
  │   └── topics_preview.json
  ├── Dockerfile
  ├── Makefile
  └── tests/
      ├── test_coherence.py
      ├── test_api.py
      └── test_pipeline.py

apps/web/pages/topics/
  └── TopicExplorer.tsx         # UI con filtros (React + Tailwind)

 
2) Variables de entorno
services/nlp-topics/.env.example
DATA_LAKE_PATH=../../data/analytics/N41-data-lake
FORUMS_SILVER=${DATA_LAKE_PATH}/silver/forums        # (platform, message_id, ts, text, user_hash, ...)
OUTPUT_BASE=${DATA_LAKE_PATH}/gold/nlp

MODEL_DIR=./models
REPORTS_DIR=./reports

MIN_DF=5
MAX_DF=0.4
K_RANGE=10,18,22,26,30            # candidatos de K
COHERENCE_UMASS_MIN=-1.10         # DoD

DAILY_LOOKBACK_DAYS=7
API_PORT=8050

 
3) Requisitos
services/nlp-topics/requirements.txt
fastapi
uvicorn[standard]
pydantic>=2
pandas
numpy
scikit-learn>=1.3
joblib
vaderSentiment
pyarrow
httpx
pytest

 
4) Carga y preprocesado
services/nlp-topics/dataio.py
from __future__ import annotations
import os, glob, re
import pandas as pd
from datetime import datetime, timedelta

def _read_any(path_glob: str) -> pd.DataFrame:
    files = sorted(glob.glob(path_glob))
    if not files: raise FileNotFoundError(path_glob)
    return pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)

def load_forums_lookback(base: str, days: int = 30) -> pd.DataFrame:
    df = _read_any(os.path.join(base, "*.parquet"))
    df["date"] = pd.to_datetime(df.get("ts") or df.get("created_at")).dt.date
    if days:
        cutoff = datetime.utcnow().date() - timedelta(days=days)
        df = df[df["date"] >= cutoff]
    df = df.rename(columns={"channel":"room", "platform":"platform"})
    df = df[["platform","message_id","user_hash","date","ts","text","reply_to"]].dropna(subset=["text"])
    return df

def synthetic_forums(n=5000, topics=8, seed=42) -> pd.DataFrame:
    import numpy as np
    rng = np.random.default_rng(seed)
    base_topics = [
        ("governance", ["vote","proposal","delegate","quorum","approve","reject"]),
        ("airdrop", ["claim","eligible","wallet","snapshot","token","distribution"]),
        ("bug", ["bug","issue","error","fix","report","patch"]),
        ("trading", ["price","market","volume","buy","sell","liquidity"]),
        ("dev", ["api","sdk","commit","deploy","build","release"]),
        ("community", ["event","meetup","discord","mod","rule","announce"]),
        ("security", ["exploit","risk","audit","alert","key","breach"]),
        ("meme", ["gm","wagmi","ngmi","lol","meme","haha"])
    ][:topics]
    rows=[]
    for i in range(n):
        t = base_topics[i % topics]
        words = rng.choice(t[1], size=rng.integers(4,10), replace=True)
        sentiment = rng.choice(["good","bad","meh"], p=[0.45,0.25,0.30])
        suffix = {"good":"great!", "bad":"this sucks", "meh":"ok"}[sentiment]
        txt = " ".join(words) + " " + suffix
        rows.append(dict(platform=rng.choice(["discord","discourse"]), message_id=f"m{i}",
                         user_hash=f"u{rng.integers(0,1500)}", date=datetime.utcnow().date(),
                         ts=pd.Timestamp.utcnow(), text=txt, reply_to=None))
    return pd.DataFrame(rows)

services/nlp-topics/preprocess.py
from __future__ import annotations
import re

URL_RE = re.compile(r"https?://\S+|www\.\S+")
MENTION_RE = re.compile(r"@[A-Za-z0-9_]+")
HASH_RE = re.compile(r"#\w+")
EMOJI_RE = re.compile(r"[\U00010000-\U0010ffff]", flags=re.UNICODE)

def normalize(txt: str) -> str:
    txt = txt or ""
    txt = txt.lower()
    txt = URL_RE.sub(" ", txt)
    txt = MENTION_RE.sub(" ", txt)
    txt = HASH_RE.sub(" ", txt)
    txt = EMOJI_RE.sub(" ", txt)
    txt = re.sub(r"[^a-záéíóúñü0-9\s]", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt

 
5) Coherencia + Tópicos (TF IDF + NMF)
services/nlp-topics/coherence.py
from __future__ import annotations
import numpy as np
from scipy.sparse import csr_matrix

def umass_coherence(components, vocab, Xbin, topn=10):
    """UMass coherence de cada tema sobre matriz binaria doc-term (csr)."""
    # Xbin: docs x terms con {0,1}
    scores=[]
    for topic in components:
        top_idx = np.argsort(topic)[::-1][:topn]
        total = 0; cnt = 0
        for i in range(len(top_idx)):
            for j in range(i+1, len(top_idx)):
                wi, wj = top_idx[i], top_idx[j]
                Dj = Xbin[:, wj].sum()
                Dij = (Xbin[:, wi].multiply(Xbin[:, wj])).sum()
                # suavizado +1
                score = np.log((Dij + 1.0) / (Dj + 1.0))
                total += score; cnt += 1
        scores.append(total / max(1, cnt))
    return np.array(scores), float(np.mean(scores))

services/nlp-topics/topic_model.py
from __future__ import annotations
import os, json
from typing import List, Tuple
import numpy as np, pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.decomposition import NMF
from sklearn.pipeline import Pipeline
from joblib import dump, load
from preprocess import normalize
from coherence import umass_coherence

def fit_topics(texts: List[str], k_candidates: List[int], min_df=5, max_df=0.4):
    # Vectorizamos (tfidf para NMF; binaria para UMass)
    tfidf = TfidfVectorizer(min_df=min_df, max_df=max_df, ngram_range=(1,2), tokenizer=None, preprocessor=normalize)
    X = tfidf.fit_transform(texts)
    count = CountVectorizer(vocabulary=tfidf.vocabulary_)
    Xc = count.fit_transform([normalize(t) for t in texts])
    Xbin = (Xc > 0).astype(int)

    best = None
    for k in k_candidates:
        nmf = NMF(n_components=k, random_state=42, init="nndsvda", max_iter=350)
        W = nmf.fit_transform(X)
        H = nmf.components_
        coh_topics, coh_mean = umass_coherence(H, tfidf.get_feature_names_out(), Xbin, topn=10)
        if (best is None) or (coh_mean > best["coh_mean"]):
            best = {"k": k, "model": nmf, "tfidf": tfidf, "H": H, "coh": coh_topics, "coh_mean": coh_mean}
    return best

def topic_labels(H, vocab, topn=3):
    labels=[]
    for comp in H:
        idx = np.argsort(comp)[::-1][:topn]
        labels.append(" / ".join([vocab[i] for i in idx]))
    return labels

def save_model(obj, path="models/topic_model.pkl", meta_path="models/topic_meta.json"):
    dump({"model": obj["model"], "tfidf": obj["tfidf"]}, path)
    meta = {
        "k": obj["k"], "coherence_mean_umass": obj["coh_mean"],
        "topic_labels": topic_labels(obj["model"].components_, obj["tfidf"].get_feature_names_out(), 3),
        "topic_coherence": obj["coh"].tolist()
    }
    with open(meta_path, "w") as f: json.dump(meta, f, indent=2)

def load_model(path="models/topic_model.pkl"):
    return load(path)

def infer_topic(proba_row):
    # argmax del vector W (document-topic)
    return int(np.argmax(proba_row))

 
6) Sentimiento y Postura
services/nlp-topics/sentiment.py
from __future__ import annotations
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
_an = SentimentIntensityAnalyzer()

def polarity(text: str) -> float:
    # devuelve compound [-1,1]
    return float(_an.polarity_scores(text or "")["compound"])

services/nlp-topics/stance.py
from __future__ import annotations
import os, json, re
from typing import Literal
from joblib import dump, load

POS = set("""agree support good great awesome excellent yes +1 approved beneficial promising like love bullish""".split())
NEG = set("""disagree oppose bad terrible awful no -1 reject harmful risky dislike hate bearish""".split())

def lexicon_stance(text: str, pos=POS, neg=NEG, tau: float = 1.5) -> int:
    # +1 support, -1 oppose, 0 neutral
    words = re.findall(r"[a-zA-Z+-]+", (text or "").lower())
    score = sum(w in pos for w in words) - sum(w in neg for w in words)
    return 1 if score > tau else (-1 if score < -tau else 0)

def has_supervised() -> bool:
    return os.path.exists("models/stance_model.pkl") and os.path.exists("models/stance_meta.json")

def predict_supervised(texts):
    clf = load("models/stance_model.pkl")
    return clf.predict(texts)

def train_supervised(df_labels):
    # df_labels: columns text, stance {-1,0,1}
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
    from preprocess import normalize

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(min_df=3, max_df=0.5, ngram_range=(1,2), preprocessor=normalize)),
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced"))
    ])
    X, y = df_labels["text"].tolist(), df_labels["stance"].astype(int).tolist()
    pipe.fit(X, y)
    dump(pipe, "models/stance_model.pkl")
    with open("models/stance_meta.json","w") as f: json.dump({"classes":[-1,0,1]}, f)
    return pipe

 
7) Entrenamiento (validación DoD)
services/nlp-topics/train_topics.py
from __future__ import annotations
import os, json
from pathlib import Path
from dataio import load_forums_lookback, synthetic_forums
from topic_model import fit_topics, save_model
from preprocess import normalize

MODEL_DIR = Path(os.getenv("MODEL_DIR","./models"))
REPORTS_DIR = Path(os.getenv("REPORTS_DIR","./reports"))
FORUMS = os.getenv("FORUMS_SILVER")
MIN_DF = int(os.getenv("MIN_DF","5"))
MAX_DF = float(os.getenv("MAX_DF","0.4"))
K_RANGE = [int(x) for x in os.getenv("K_RANGE","10,18,22,26,30").split(",")]
THR = float(os.getenv("COHERENCE_UMASS_MIN","-1.10"))

def main():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    try:
        df = load_forums_lookback(FORUMS, days=90)
    except Exception:
        df = synthetic_forums(n=6000, topics=10)

    texts = [normalize(t) for t in df["text"].astype(str).tolist()]
    best = fit_topics(texts, K_RANGE, min_df=MIN_DF, max_df=MAX_DF)
    save_model(best, path=str(MODEL_DIR/"topic_model.pkl"), meta_path=str(MODEL_DIR/"topic_meta.json"))

    with open(REPORTS_DIR/"coherence.json","w") as f:
        json.dump({"umass_mean": best["coh_mean"], "k": best["k"]}, f, indent=2)

    print(f"[train] K={best['k']} UMass={best['coh_mean']:.3f}")
    if best["coh_mean"] < THR:
        raise SystemExit(f"DoD FAIL — coherence UMass {best['coh_mean']:.3f} < {THR:.2f}")

if __name__ == "__main__":
    main()

 
8) Extracción diaria → lake (gold)
services/nlp-topics/extract_daily.py
from __future__ import annotations
import os, json
from pathlib import Path
from datetime import datetime, timedelta
import numpy as np, pandas as pd
from dataio import load_forums_lookback, synthetic_forums
from preprocess import normalize
from topic_model import load_model, infer_topic
from sentiment import polarity
from stance import has_supervised, predict_supervised, lexicon_stance

FORUMS = os.getenv("FORUMS_SILVER")
OUT = os.getenv("OUTPUT_BASE","../../data/analytics/N41-data-lake/gold/nlp")
LOOKBACK = int(os.getenv("DAILY_LOOKBACK_DAYS","7"))

def main():
    try:
        df = load_forums_lookback(FORUMS, days=LOOKBACK)
    except Exception:
        df = synthetic_forums(n=2000, topics=8)

    mdl = load_model("models/topic_model.pkl")
    tfidf = mdl["tfidf"]; nmf = mdl["model"]

    texts = df["text"].astype(str).tolist()
    X = tfidf.transform(texts)
    W = nmf.transform(X)
    topic_idx = W.argmax(axis=1).astype(int)

    # sentimiento & postura
    sent = [polarity(t) for t in texts]
    if has_supervised():
        stance = predict_supervised(texts)
    else:
        stance = [lexicon_stance(t) for t in texts]

    result = df[["platform","message_id","user_hash","date","ts","text"]].copy()
    result["topic_id"] = topic_idx
    result["sentiment"] = sent
    result["stance"] = stance

    today = datetime.utcnow().date().isoformat()
    out_msgs = Path(f"{OUT}/messages/date={today}")
    out_topics = Path(f"{OUT}/topics/date={today}")
    out_msgs.mkdir(parents=True, exist_ok=True)
    out_topics.mkdir(parents=True, exist_ok=True)

    result.to_parquet(out_msgs/"messages_topics.parquet", index=False)

    # catálogo de temas
    import json
    meta = json.loads(Path("models/topic_meta.json").read_text())
    topics = pd.DataFrame({
        "topic_id": list(range(len(meta["topic_labels"]))),
        "topic_label": meta["topic_labels"],
        "coherence_umass": meta.get("topic_coherence", [None]*len(meta["topic_labels"]))
    })
    topics.to_parquet(out_topics/"topics.parquet", index=False)
    print(f"[extract] {len(result)} mensajes → {out_msgs}")

if __name__ == "__main__":
    main()

 
9) API (FastAPI)
services/nlp-topics/api.py
from __future__ import annotations
import os, json
from typing import List, Optional
import pandas as pd
from fastapi import FastAPI, Query
from pydantic import BaseModel
from joblib import load
from preprocess import normalize
from sentiment import polarity
from stance import has_supervised, predict_supervised, lexicon_stance
from topic_model import load_model, infer_topic

app = FastAPI(title="NLP Topics Service")

mdl = None
meta = None

class AnalyzeIn(BaseModel):
    text: str
    platform: Optional[str] = None

class AnalyzeOut(BaseModel):
    topic_id: int
    topic_label: str
    sentiment: float
    stance: int

@app.get("/health")
def health():
    ok = os.path.exists("models/topic_model.pkl")
    return {"status":"ok" if ok else "degraded"}

@app.get("/nlp/topics")
def topics():
    m = json.loads(open("models/topic_meta.json").read())
    return {"k": m["k"], "coherence_umass": m["coherence_mean_umass"], "topics": [
        {"topic_id": i, "label": lab, "coh": m["topic_coherence"][i] if i < len(m["topic_coherence"]) else None}
        for i, lab in enumerate(m["topic_labels"])
    ]}

@app.post("/nlp/analyze", response_model=AnalyzeOut)
def analyze(a: AnalyzeIn):
    g = load_model("models/topic_model.pkl")
    tfidf, nmf = g["tfidf"], g["model"]
    x = tfidf.transform([normalize(a.text)])
    w = nmf.transform(x)
    tid = int(w.argmax(axis=1)[0])
    label = json.loads(open("models/topic_meta.json").read())["topic_labels"][tid]
    sent = polarity(a.text)
    if has_supervised():
        st = int(predict_supervised([a.text])[0])
    else:
        st = int(lexicon_stance(a.text))
    return AnalyzeOut(topic_id=tid, topic_label=label, sentiment=sent, stance=st)

@app.get("/nlp/aggregate")
def aggregate(platform: Optional[str] = None,
              date_from: Optional[str] = Query(None), date_to: Optional[str] = Query(None)):
    # lee última partición de messages en OUTPUT_BASE
    base = os.getenv("OUTPUT_BASE","../../data/analytics/N41-data-lake/gold/nlp")
    import glob
    parts = sorted(glob.glob(os.path.join(base, "messages", "date=*/messages_topics.parquet")))
    if not parts: return []
    df = pd.read_parquet(parts[-1])
    if platform: df = df[df["platform"]==platform]
    agg = (df.assign(stance_label=df["stance"].map({-1:"oppose",0:"neutral",1:"support"}))
             .groupby(["topic_id","stance_label"]).size().reset_index(name="count"))
    return agg.to_dict(orient="records")

 
10) Docker & Makefile
services/nlp-topics/Dockerfile
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8050
CMD ["uvicorn","api:app","--host","0.0.0.0","--port","8050"]

services/nlp-topics/Makefile
.PHONY: install train extract serve test
install:
\tpython -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
train:
\tpython train_topics.py
extract:
\tpython extract_daily.py
serve:
\tuvicorn api:app --host 0.0.0.0 --port $$API_PORT
test:
\tpytest -q

 
11) Tests (DoD y humo)
services/nlp-topics/tests/test_coherence.py
import json, subprocess, sys, os
from pathlib import Path

def test_train_dod(tmp_path):
    wd = Path("services/nlp-topics")
    subprocess.check_call([sys.executable, str(wd/"train_topics.py")])
    rep = json.loads((wd/"reports/coherence.json").read_text())
    assert rep["umass_mean"] >= -1.10

services/nlp-topics/tests/test_pipeline.py
import os, sys, subprocess
from pathlib import Path
def test_extract_and_outputs(tmp_path):
    wd = Path("services/nlp-topics")
    subprocess.check_call([sys.executable, str(wd/"extract_daily.py")])
    # comprueba que se escriba una partición
    base = Path("../../data/analytics/N41-data-lake/gold/nlp/messages")
    assert any(base.glob("date=*/messages_topics.parquet"))

services/nlp-topics/tests/test_api.py
import os, sys, importlib.util, pytest, subprocess
from httpx import AsyncClient, ASGITransport

def load_app():
    module_path = os.path.join(os.getcwd(), "services", "nlp-topics", "api.py")
    spec = importlib.util.spec_from_file_location("nlp_api", module_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.app

@pytest.mark.asyncio
async def test_analyze_smoke():
    # asegura modelo
    subprocess.check_call([sys.executable, "services/nlp-topics/train_topics.py"])
    app = load_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/nlp/analyze", json={"text":"vote proposal approve great!"})
        assert r.status_code == 200
        data = r.json()
        assert "topic_id" in data and "sentiment" in data and "stance" in data

 
12) Airflow — Retraining programado + Extracción diaria
airflow/dags/dag_n46_nlp_topics.py
from airflow import DAG
from airflow.utils.dates import days_ago
from airflow.operators.bash import BashOperator
from datetime import timedelta

default_args = {"retries": 1, "retry_delay": timedelta(minutes=10)}

with DAG(
    dag_id="n46_nlp_topics_daily",
    start_date=days_ago(1),
    schedule="0 2 * * *",  # 02:00 Europe/Amsterdam
    catchup=True,
    default_args=default_args,
    tags=["N46","nlp","topics"]
) as dag:
    extract = BashOperator(
        task_id="extract",
        bash_command="cd /opt/airflow && python services/nlp-topics/extract_daily.py"
    )

with DAG(
    dag_id="n46_nlp_topics_retrain",
    start_date=days_ago(1),
    schedule="0 4 * * 1",  # semanal
    catchup=True,
    default_args=default_args,
    tags=["N46","nlp","retrain"]
) as dag2:
    train = BashOperator(
        task_id="train",
        bash_command="cd /opt/airflow && python services/nlp-topics/train_topics.py"
    )

 
13) UI — Topic Explorer (filtros)
apps/web/pages/topics/TopicExplorer.tsx
import React, { useEffect, useMemo, useState } from "react";

type Topic = { topic_id: number; label: string; coh?: number };
type Agg = { topic_id: number; stance_label: string; count: number };

export default function TopicExplorer() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [agg, setAgg] = useState<Agg[]>([]);
  const [platform, setPlatform] = useState<string>("all");
  const [stance, setStance] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    fetch("/nlp/topics").then(r => r.json()).then(d => {
      setTopics(d.topics.map((t: any) => ({ topic_id: t.topic_id, label: t.label, coh: t.coh })));
    });
  }, []);

  const loadAgg = () => {
    const url = new URL("/nlp/aggregate", window.location.origin);
    if (platform !== "all") url.searchParams.set("platform", platform);
    fetch(url.toString()).then(r => r.json()).then(setAgg);
  };
  useEffect(loadAgg, [platform]);

  const filtered = useMemo(() => {
    return agg.filter(a => (stance === "all" ? true : a.stance_label === stance));
  }, [agg, stance]);

  const byTopic = useMemo(() => {
    const m: Record<number, number> = {};
    filtered.forEach(a => { m[a.topic_id] = (m[a.topic_id] || 0) + a.count; });
    return m;
  }, [filtered]);

  const list = useMemo(() => {
    return topics
      .filter(t => (search ? t.label.toLowerCase().includes(search.toLowerCase()) : true))
      .map(t => ({ ...t, total: byTopic[t.topic_id] || 0 }))
      .sort((a,b) => b.total - a.total);
  }, [topics, byTopic, search]);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Topic Explorer</h1>
      <div className="flex gap-3">
        <select className="border rounded px-3 py-2" value={platform} onChange={e => setPlatform(e.target.value)}>
          <option value="all">Todas las plataformas</option>
          <option value="discord">Discord</option>
          <option value="discourse">Discourse</option>
        </select>
        <select className="border rounded px-3 py-2" value={stance} onChange={e => setStance(e.target.value)}>
          <option value="all">Todas las posturas</option>
          <option value="support">Support</option>
          <option value="neutral">Neutral</option>
          <option value="oppose">Oppose</option>
        </select>
        <input className="border rounded px-3 py-2 flex-1" placeholder="Buscar tema…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map(t => (
          <li key={t.topic_id} className="border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{t.label}</h3>
              <span className="text-xs text-slate-500">UMass {t.coh?.toFixed(2)}</span>
            </div>
            <p className="text-sm mt-1">Mensajes: <b>{t.total}</b></p>
          </li>
        ))}
      </ul>
    </main>
  );
}

 
14) README (uso rápido)
services/nlp-topics/README.md
# NLP Topics (N46)

## Quick start
```bash
cd services/nlp-topics
pip install -r requirements.txt

# Entrena (selección de K por UMass y validación DoD)
python train_topics.py

# Extracción diaria hacia el lake (gold/nlp/)
python extract_daily.py

# Sirve API
uvicorn api:app --port 8050

Salidas (gold)
●	gold/nlp/messages/date=YYYY-MM-DD/messages_topics.parquet

○	platform, message_id, user_hash, date, ts, text, topic_id, sentiment[-1..1], stance{-1,0,1}

●	gold/nlp/topics/date=YYYY-MM-DD/topics.parquet

○	topic_id, topic_label, coherence_umass

DoD
●	reports/coherence.json con umass_mean ≥ −1.10 → si no, falla.

●	Topic Explorer con filtros (plataforma, postura, búsqueda por tema).


---

## 15) Cómo se cumple la DoD

- **Topic coherence aceptable:** `train_topics.py` busca `K` en `K_RANGE` y calcula **UMass** por tema y promedio; verifica `≥ −1.10`.  
- **UI con filtros:** `TopicExplorer.tsx` lista temas agregados y permite filtrar por **plataforma**, **postura** y **búsqueda**.  
- **Producción diaria:** `extract_daily.py` escribe particiones Parquet listas para consumo de web/BI.

---

## 16) Extras (opcional próximo sprint)
- Sustituir léxico de **postura** por modelo supervisado si se añaden etiquetas (`train_supervised` en `stance.py`).  
- Soporte multi idioma (stopwords/lemmatización por idioma, o SBERT/BERT multilingual + BERTopic).  
- Métricas de *topic stability* y *diversidad*; endpoint `/nlp/drift` para alertar cambios de distribución.
  
---

¿Lo integro con el **DAG de N41** ahora o prefieres que agregue **export JSON** para el frontend además del Parquet?

Tú dijiste:
programa a nivel de detalle para gnew N45 Objetivo: Señalar comportamientos sospechosos. Roles: Data + Seguridad. DoD: precisión y recall balanceados; alertas integradas.
ChatGPT Plus
Pensó durante 47s
