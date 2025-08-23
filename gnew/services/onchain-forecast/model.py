from __future__ import annotations
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline

def build_regressor(kind: str = "hgb") -> Pipeline:
    # Dos alternativas robustas y ligeras
    if kind == "ridge":
        reg = Ridge(alpha=1.0, random_state=42)
    else:
        reg = HistGradientBoostingRegressor(
            max_depth=6, learning_rate=0.08, max_iter=600, min_samples_leaf=25,
            l2_regularization=0.0, random_state=42
        )
    # Preprocesado: escalar numéricas y one-hot para variables discretas (dow)
    def _split_cols(cols):
        num, cat = [], []
        for c in cols:
            if c.startswith("dow"): cat.append(c)
            else: num.append(c)
        return num, cat
    # El ColumnTransformer se construye dinámicamente en train.py cuando se conocen los features
    return reg, _split_cols

 
7) Backtest (rolling) + MAPE
