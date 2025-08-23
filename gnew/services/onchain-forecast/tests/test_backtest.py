import json, os, subprocess, sys
from pathlib import Path

def test_train_dod(tmp_path):
    wd = Path("services/onchain-forecast")
    subprocess.check_call([sys.executable, str(wd/"train.py")])
    assert (wd/"models/volume.pkl").exists()
    assert (wd/"models/apr.pkl").exists()
    report = json.loads((wd/"reports/backtest.json").read_text())
    assert report["volume_usd"]["mape"] <= 0.15
    assert report["fee_apr"]["mape"] <= 0.15

