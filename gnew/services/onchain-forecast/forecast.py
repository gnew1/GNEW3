from __future__ import annotations
import os
from pathlib import Path
from datetime import datetime, timedelta
import numpy as np, pandas as pd
from joblib import load
from data_prep import load_tx_tvl, build_dataset
from features import add_time_features, add_lags_rolls

MODEL_DIR = Path(os.getenv("MODEL_DIR","./models"))
FORECAST_OUT = os.getenv("FORECAST_OUT","../../data/analytics/N41-data-lake/gold/forecast/onchain")
H = int(os.getenv("HORIZON_DAYS","7"))

def _next_dates(last_date, h=7):
    start = pd.to_datetime(last_date) + pd.Timedelta(days=1)
    return pd.date_range(start, periods=h, freq="D").date

def main():
    # Cargar datos y modelos
    tx_path, tvl_path = os.getenv("TX_DAILY_PATH"), os.getenv("TVL_DAILY_PATH")
    tx, tvl = load_tx_tvl(tx_path, tvl_path)
    hist = build_dataset(tx, tvl)
    hist = add_time_features(hist)
    hist = add_lags_rolls(hist)

    vol = load(MODEL_DIR/"volume.pkl")
    apr = load(MODEL_DIR/"apr.pkl")

    # Para cada mercado, generar horizonte h con estrategia recursive (t+1, realimentando)
    out = []
    for mkt, g in hist.groupby("market_id"):
        g = g.sort_values("date").copy()
        last = g["date"].max()
        dates = _next_dates(last, H)
        cur = g.copy()
        for d in dates:
            # recomputar features para la nueva fecha 'd'
            row = dict(date=d, chain=cur.iloc[-1]["chain"], network=cur.iloc[-1]["network"],
                       market_id=mkt, volume_usd=cur.iloc[-1]["volume_usd"],
                       tvl_usd=cur.iloc[-1]["tvl_usd"], fee_apr=cur.iloc[-1]["fee_apr"],
                       tx_count=cur.iloc[-1]["tx_count"], success_rate=cur.iloc[-1]["success_rate"])
            step = pd.DataFrame([row])
            tmp = pd.concat([cur, step], ignore_index=True)
            tmp = add_time_features(tmp)
            tmp = add_lags_rolls(tmp)
            # último registro para inferencia
            Xv_cols = [c for c in tmp.columns if any(k in c for k in ("lag","roll","tvl_lag","dow","is_month_end","chain_vol"))]
            x = tmp.iloc[-1:][Xv_cols]
            vol_pred = float(vol.predict(x)[0])
            apr_pred = float(apr.predict(x)[0])
            apr_pred = float(np.clip(apr_pred, 0, 2.0))
            # actualizar cur con predicción como observación para recursividad
            tmp.at[tmp.index[-1], "volume_usd"] = vol_pred
            tmp.at[tmp.index[-1], "fee_apr"] = apr_pred
            cur = tmp
            out.append(dict(date=d, market_id=mkt,
                            chain=row["chain"], network=row["network"],
                            volume_pred=vol_pred, apr_pred=apr_pred))
    df = pd.DataFrame(out)
    today = datetime.utcnow().date().isoformat()
    outdir = Path(f"{FORECAST_OUT}/date={today}")
    outdir.mkdir(parents=True, exist_ok=True)
    df.to_parquet(outdir/"onchain_forecast.parquet", index=False)
    print(f"[forecast] {len(df)} filas → {outdir}/onchain_forecast.parquet")

if __name__ == "__main__":
    main()

 
10) API (FastAPI)
