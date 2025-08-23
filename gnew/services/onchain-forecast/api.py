from __future__ import annotations
import os, json
from typing import List, Optional
import pandas as pd
from fastapi import FastAPI, Query
from pydantic import BaseModel
from joblib import load
from pathlib import Path
from datetime import date

from data_prep import load_tx_tvl, build_dataset
from features import add_time_features, add_lags_rolls

MODEL_DIR = Path(os.getenv("MODEL_DIR","./models"))

app = FastAPI(title="On-chain Forecast API")

@app.get("/health")
def health():
    ok = (MODEL_DIR/"volume.pkl").exists() and (MODEL_DIR/"apr.pkl").exists()
    return {"status":"ok" if ok else "degraded"}

class ForecastItem(BaseModel):
    date: str
    market_id: str
    volume_pred: float
    apr_pred: float

@app.get("/predict/onchain", response_model=List[ForecastItem])
def predict_onchain(market_id: str = Query(...), horizon: int = Query(7, ge=1, le=30)):
    # Carga histórico y modelos
    tx_path, tvl_path = os.getenv("TX_DAILY_PATH"), os.getenv("TVL_DAILY_PATH")
    tx, tvl = load_tx_tvl(tx_path, tvl_path)
    hist = build_dataset(tx, tvl)
    hist = hist[hist["market_id"]==market_id]
    if hist.empty:
        return []
    # reutiliza el mismo método recursivo de forecast.py (acotado al market)
    from forecast import _next_dates
    vol = load(MODEL_DIR/"volume.pkl")
    apr = load(MODEL_DIR/"apr.pkl")
    hist = add_time_features(hist)
    hist = add_lags_rolls(hist)
    cur = hist.sort_values("date").copy()
    last = cur["date"].max()
    dates = _next_dates(last, horizon)
    out = []
    for d in dates:
        row = dict(date=d, chain=cur.iloc[-1]["chain"], network=cur.iloc[-1]["network"],
                   market_id=market_id, volume_usd=cur.iloc[-1]["volume_usd"],
                   tvl_usd=cur.iloc[-1]["tvl_usd"], fee_apr=cur.iloc[-1]["fee_apr"],
                   tx_count=cur.iloc[-1]["tx_count"], success_rate=cur.iloc[-1]["success_rate"])
        step = pd.DataFrame([row])
        tmp = pd.concat([cur, step], ignore_index=True)
        tmp = add_time_features(tmp)
        tmp = add_lags_rolls(tmp)
        cols = [c for c in tmp.columns if any(k in c for k in ("lag","roll","tvl_lag","dow","is_month_end","chain_vol"))]
        x = tmp.iloc[-1:][cols]
        vol_pred = float(vol.predict(x)[0])
        apr_pred = float(apr.predict(x)[0])
        apr_pred = max(0.0, min(2.0, apr_pred))
        tmp.at[tmp.index[-1], "volume_usd"] = vol_pred
        tmp.at[tmp.index[-1], "fee_apr"] = apr_pred
        cur = tmp
        out.append(ForecastItem(date=str(d), market_id=market_id, volume_pred=vol_pred, apr_pred=apr_pred))
    return out

 
11) Docker & Makefile
