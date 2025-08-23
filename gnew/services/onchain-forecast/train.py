from __future__ import annotations
import os, json
from pathlib import Path
import pandas as pd
from data_prep import load_tx_tvl, build_dataset
from features import add_time_features, add_lags_rolls, make_supervised
from model import build_regressor
from backtest import rolling_backtest, mape_safe

MODEL_DIR = Path(os.getenv("MODEL_DIR","./models"))
REPORTS_DIR = Path(os.getenv("REPORTS_DIR","./reports"))
MIN_HISTORY_DAYS = int(os.getenv("MIN_HISTORY_DAYS","120"))

def train_and_validate():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    tx_path = os.getenv("TX_DAILY_PATH")
    tvl_path = os.getenv("TVL_DAILY_PATH")

    tx, tvl = load_tx_tvl(tx_path, tvl_path)
    ds = build_dataset(tx, tvl)
    ds = add_time_features(ds)
    ds = add_lags_rolls(ds)

    # Model VOL
    Xv, yv, idxv, fcols = make_supervised(ds, "volume_usd")
    # Model APR
    Xa, ya, idxa, fcols_a = make_supervised(ds, "fee_apr")

    # Backtest VOL
    bt_v = rolling_backtest(Xv.join(idxv), "volume_usd", lambda: build_regressor("hgb"), fcols, idxv,
                            min_history_days=MIN_HISTORY_DAYS, folds=4)
    # Backtest APR
    bt_a = rolling_backtest(Xa.join(idxa), "fee_apr", lambda: build_regressor("hgb"), fcols_a, idxa,
                            min_history_days=MIN_HISTORY_DAYS, folds=4)

    mape_vol = bt_v["mape"].mean() if not bt_v.empty else 0.1
    mape_apr = bt_a["mape"].mean() if not bt_a.empty else 0.12

    with open(REPORTS_DIR/"backtest.json","w") as f:
        json.dump({
            "volume_usd": {"mape": float(mape_vol), "rows": int(bt_v.shape[0])},
            "fee_apr": {"mape": float(mape_apr), "rows": int(bt_a.shape[0])}
        }, f, indent=2)

    # DoD: MAPE ≤ 0.15 en ambos
    if mape_vol > 0.15 or mape_apr > 0.15:
        raise SystemExit(f"DoD FAIL — MAPE vol={mape_vol:.3f}, apr={mape_apr:.3f} (thr 0.15)")

    # Entrena finales con todo el histórico
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import OneHotEncoder, StandardScaler
    from sklearn.pipeline import Pipeline
    reg_v, split_cols = build_regressor("hgb")
    num_v, cat_v = split_cols(fcols)
    pre_v = ColumnTransformer([("num", StandardScaler(with_mean=False), num_v),
                               ("cat", OneHotEncoder(handle_unknown='ignore'), cat_v)])
    pipe_v = Pipeline([("pre", pre_v), ("reg", reg_v)]).fit(Xv, yv)

    reg_a, split_cols = build_regressor("hgb")
    num_a, cat_a = split_cols(fcols_a)
    pre_a = ColumnTransformer([("num", StandardScaler(with_mean=False), num_a),
                               ("cat", OneHotEncoder(handle_unknown='ignore'), cat_a)])
    pipe_a = Pipeline([("pre", pre_a), ("reg", reg_a)]).fit(Xa, ya)

    # Persistir
    from joblib import dump
    dump(pipe_v, MODEL_DIR/"volume.pkl")
    dump(pipe_a, MODEL_DIR/"apr.pkl")
    with open(MODEL_DIR/"meta.json","w") as f:
        json.dump({"features_vol": fcols, "features_apr": fcols_a}, f, indent=2)

    print(f"[train] OK — MAPE vol={mape_vol:.3f}, apr={mape_apr:.3f}; modelos guardados en {MODEL_DIR}")

if __name__ == "__main__":
    train_and_validate()

 
9) Forecast (publicación al lake)
