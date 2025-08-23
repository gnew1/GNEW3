import os, sys, importlib.util, pytest
from httpx import AsyncClient, ASGITransport

def load_app():
    module_path = os.path.join(os.getcwd(), "services", "onchain-forecast", "api.py")
    spec = importlib.util.spec_from_file_location("api_mod", module_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.app

@pytest.mark.asyncio
async def test_predict_onchain_smoke():
    app = load_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Entrenar primero si no hay modelos
        import subprocess
        subprocess.check_call([sys.executable, "services/onchain-forecast/train.py"])
        # Usar un market sintético conocido
        resp_h = await ac.get("/health")
        assert resp_h.status_code == 200
        # No sabemos el market_id; probamos con uno común
        # iterar candidatos
        for candidate in ["eth:mainnet","polygon:l2","bsc:mainnet","arbitrum:l2","avalanche:mainnet","base:l2"]:
            r = await ac.get("/predict/onchain", params={"market_id": candidate, "horizon": 3})
            if r.status_code == 200 and isinstance(r.json(), list):
                break
        assert r.status_code == 200

 
13) Airflow — Retraining programado + Forecast diario
(añadir en N41 Airflow airflow/dags/dag_n44_onchain.py)
from airflow import DAG
from airflow.utils.dates import days_ago
from airflow.operators.bash import BashOperator
from datetime import timedelta

default_args = {"retries": 1, "retry_delay": timedelta(minutes=15)}

with DAG(
    dag_id="n44_onchain_forecast",
    start_date=days_ago(1),
    schedule="30 3 * * *",   # forecast diario 03:30 Europe/Amsterdam
    catchup=True,
    default_args=default_args,
    tags=["N44","forecast","onchain"]
) as dag:
    forecast = BashOperator(
        task_id="forecast_daily",
        bash_command="cd /opt/airflow && python services/onchain-forecast/forecast.py"
    )

with DAG(
    dag_id="n44_onchain_retrain",
    start_date=days_ago(1),
    schedule="0 4 * * 1",    # retraining semanal (lunes 04:00)
    catchup=True,
    default_args=default_args,
    tags=["N44","retrain","onchain"]
) as dag2:
    retrain = BashOperator(
        task_id="retrain_weekly",
        bash_command="cd /opt/airflow && python services/onchain-forecast/train.py"
    )

 
14) README (uso rápido)
