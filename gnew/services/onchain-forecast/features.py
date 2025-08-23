from __future__ import annotations
import pandas as pd
import numpy as np

def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    dts = pd.to_datetime(df["date"])
    df["dow"] = dts.dt.weekday
    df["is_month_end"] = dts.dt.is_month_end.astype(int)
    return df

def add_lags_rolls(df: pd.DataFrame, cols=("volume_usd","fee_apr"), lags=(1,2,3,7,14), rolls=(3,7,14)) -> pd.DataFrame:
    df = df.sort_values(["market_id","date"]).copy()
    for c in cols:
        for L in lags:
            df[f"{c}_lag{L}"] = df.groupby("market_id")[c].shift(L)
        for W in rolls:
            df[f"{c}_roll{W}_mean"] = df.groupby("market_id")[c].shift(1).rolling(W).mean()
            df[f"{c}_roll{W}_std"]  = df.groupby("market_id")[c].shift(1).rolling(W).std()
            df[f"{c}_roll{W}_pct"]  = (df[c] / (df[f"{c}_roll{W}_mean"]+1e-9)).clip(0, 5.0)
    # señales de TVL
    for L in (1,3,7,14):
        df[f"tvl_lag{L}"] = df.groupby("market_id")["tvl_usd"].shift(L)
    # mercados agregados por chain (exógenas macro)
    chain_agg = df.groupby(["date","chain"])["volume_usd"].sum().reset_index(name="chain_vol")
    df = df.merge(chain_agg, on=["date","chain"], how="left")
    for L in (1,3,7):
        df[f"chain_vol_lag{L}"] = df.groupby("chain")["chain_vol"].shift(L)
    return df

def make_supervised(df: pd.DataFrame, target: str):
    # Predecimos el día t+1 → desplazamos target -1
    df = df.copy()
    df[f"{target}_tgt"] = df.groupby("market_id")[target].shift(-1)
    # Filtramos filas con suficientes lags
    fcols = [c for c in df.columns if any(k in c for k in ("lag","roll","tvl_lag","dow","is_month_end","chain_vol"))]
    feats = df.dropna(subset=fcols + [f"{target}_tgt"]).copy()
    X = feats[fcols]
    y = feats[f"{target}_tgt"].astype(float)
    idx = feats[["market_id","date"]]
    return X, y, idx, fcols

 
6) Modelos
