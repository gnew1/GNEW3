from __future__ import annotations
import numpy as np, pandas as pd
from sklearn.metrics import mean_absolute_percentage_error

def smape(y_true, y_pred, eps: float = 1e-6):
    num = np.abs(y_pred - y_true)
    den = (np.abs(y_true) + np.abs(y_pred) + eps) / 2.0
    return np.mean(num / den)

def mape_safe(y_true, y_pred, eps: float = 1e-6):
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    return np.mean(np.abs((y_true - y_pred) / (np.maximum(eps, np.abs(y_true)))))

def rolling_backtest(df: pd.DataFrame, target: str, model_builder, fcols, idx,
                     min_history_days=120, folds=4):
    """Evalúa MAPE con origen rodante por mercado (t+1)."""
    out = []
    data = pd.concat([idx.reset_index(drop=True), df.reset_index(drop=True)], axis=1)
    for mkt, g in data.groupby("market_id"):
        g = g.sort_values("date")
        if len(g) < min_history_days + 30:
            continue
        # cortamos últimos ~120 días en 4 folds
        test_len = min(120, len(g)//3)
        fold_len = test_len // folds
        for i in range(folds):
            split = len(g) - test_len + i*fold_len
            Xtr = g.iloc[:split][fcols]
            ytr = g.iloc[:split][f"{target}_tgt"]
            Xte = g.iloc[split:split+fold_len][fcols]
            yte = g.iloc[split:split+fold_len][f"{target}_tgt"]
            reg, split_cols = model_builder()
            num, cat = split_cols(fcols)
            from sklearn.compose import ColumnTransformer
            from sklearn.preprocessing import OneHotEncoder, StandardScaler
            pre = ColumnTransformer([
                ("num", StandardScaler(with_mean=False), num),
                ("cat", OneHotEncoder(handle_unknown="ignore"), cat),
            ], remainder="drop")
            from sklearn.pipeline import Pipeline
            pipe = Pipeline([("pre", pre), ("reg", reg)])
            pipe.fit(Xtr, ytr)
            pred = pipe.predict(Xte)
            out.append(dict(
                market_id=mkt, fold=i, target=target,
                mape=mape_safe(yte, pred), smape=smape(yte, pred),
                n=len(yte)
            ))
    res = pd.DataFrame(out)
    return res

 
8) Entrenamiento (con DoD)
