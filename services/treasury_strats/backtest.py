""" 
Backtesting simple de DCA con CSV OHLC (col: timestamp, close). 
Simula compras periódicas y calcula desviación vs TWAP. 
Uso: 
  python services/treasury_strats/backtest.py data/eth_usd_daily.csv --period "1d" --amount 100 
""" 
import argparse, pandas as pd 
from decimal import Decimal 
import numpy as np 
 
def run(df: pd.DataFrame, amount: float, period: str): 
    df = df.copy() 
    df["ts"] = pd.to_datetime(df["timestamp"], unit="s") 
    df = df.set_index("ts").sort_index() 
    dfp = df.resample(period).last().dropna() 
    # Contribuciones fijas (USD) 
    dfp["buy_units"] = Decimal(str(amount)) / dfp["close"] 
    dfp["cum_units"] = dfp["buy_units"].cumsum() 
    dfp["cum_spent"] = np.arange(1, len(dfp)+1, dtype=float) * amount 
    dfp["avg_price"] = dfp["cum_spent"] / dfp["cum_units"] 
    # TWAP del periodo 
    dfp["twap"] = 
df["close"].resample(period).mean().reindex(dfp.index) 
    dfp["deviation_pct"] = (dfp["avg_price"] - dfp["twap"]) / 
dfp["twap"] * 100.0 
    return dfp 
 
if __name__ == "__main__": 
    ap = argparse.ArgumentParser() 
    ap.add_argument("csv") 
    ap.add_argument("--period", default="1d") 
    ap.add_argument("--amount", type=float, default=100.0) 
    args = ap.parse_args() 
    df = pd.read_csv(args.csv) 
    out = run(df, args.amount, args.period) 
    print(out[["close","avg_price","twap","deviation_pct"]].tail(10)) 
    print(f"Desviación absoluta media: 
{out['deviation_pct'].abs().mean():.3f}%") 
 
 
