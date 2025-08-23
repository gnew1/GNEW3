from __future__ import annotations
import os, glob
import numpy as np, pandas as pd
from datetime import datetime, timedelta

def _read_any(path_glob: str) -> pd.DataFrame:
    files = sorted(glob.glob(path_glob))
    if not files:
        raise FileNotFoundError(path_glob)
    return pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)

def _synthetic(n_markets=6, days=365*2) -> pd.DataFrame:
    # Señal AR + estacionalidad para volúmenes; APR derivado de fees/TVL
    rng = np.random.default_rng(42)
    start = datetime.utcnow().date() - timedelta(days=days)
    rows = []
    for m in range(n_markets):
        chain = rng.choice(["eth","polygon","bsc","arbitrum","avalanche","base"])
        network = rng.choice(["mainnet","l2"])
        base = rng.uniform(5e5, 5e6)  # volumen base
        tvl = rng.uniform(2e6, 5e7)
        x = base * np.ones(days)
        noise = rng.normal(0, base*0.03, days)
        for t in range(1, days):
            # AR(1) suave + estacionalidad semanal
            season = 1.0 + 0.15*np.sin(2*np.pi*(t%7)/7)
            x[t] = max(0, 0.85*x[t-1]*season + noise[t])
        fees = x * 0.003  # 30 bps
        for d in range(days):
            date = start + timedelta(days=d)
            rows.append(dict(
                date=date, chain=chain, network=network,
                tx_count=int(x[d]/100), sum_amount=float(x[d]), sum_fees=float(fees[d]),
                success_rate=0.98
            ))
    tx = pd.DataFrame(rows)
    tvl_df = (tx.groupby(["date","chain","network"])["sum_amount"]
                .sum().reset_index(name="vol"))
    # TVL sintético correlacionado con vol (suavizado)
    tvl_df["tvl_usd"] = tvl_df.groupby(["chain","network"])["vol"].transform(
        lambda s: s.ewm(alpha=0.03).mean()*5 + 5e6)
    tvl_df = tvl_df.drop(columns=["vol"])
    return tx, tvl_df

def load_tx_tvl(tx_path: str|None, tvl_path: str|None):
    try:
        tx = _read_any(os.path.join(tx_path, "*.parquet")) if tx_path else None
        tvl = _read_any(os.path.join(tvl_path, "*.parquet")) if tvl_path else None
        if tx is None: raise FileNotFoundError
    except Exception:
        tx, tvl = _synthetic()
    # Normaliza tipos y claves
    tx["date"] = pd.to_datetime(tx["date"]).dt.date
    if tvl is not None:
        tvl["date"] = pd.to_datetime(tvl["date"]).dt.date
        tvl = tvl[["date","chain","network","tvl_usd"]]
    return tx, tvl

def build_dataset(tx: pd.DataFrame, tvl: pd.DataFrame|None) -> pd.DataFrame:
    df = tx.copy()
    df["market_id"] = df["chain"].astype(str) + ":" + df["network"].astype(str)
    if tvl is None:
        # aproximación de TVL a partir del volumen suavizado
        tvl = (df.groupby(["date","chain","network"])["sum_amount"].sum()
                 .reset_index(name="vol"))
        tvl["tvl_usd"] = tvl.groupby(["chain","network"])["vol"].transform(
            lambda s: s.ewm(alpha=0.04).mean()*5 + 3e6)
        tvl = tvl.drop(columns=["vol"])
    merged = df.merge(tvl, on=["date","chain","network"], how="left")
    merged["volume_usd"] = merged["sum_amount"].astype(float)
    merged["fee_apr"] = np.where(
        merged["tvl_usd"]>0, (merged["sum_fees"].astype(float) * 365.0) / merged["tvl_usd"], np.nan
    )
    # Clip APR a [0, 2] (0–200%) para robustez
    merged["fee_apr"] = merged["fee_apr"].clip(0, 2.0)
    out = merged[["date","chain","network","market_id","volume_usd","tvl_usd","fee_apr","tx_count","success_rate"]]
    return out.sort_values(["market_id","date"])

 
5) Ingeniería de features
