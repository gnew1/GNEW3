from __future__ import annotations 
import os 
from datetime import datetime, timedelta, timezone 
from airflow import DAG 
from airflow.operators.python import PythonOperator 
import psycopg2 
import requests 
from gql import Client, gql 
from gql.transport.requests import RequestsHTTPTransport 
from dateutil.relativedelta import relativedelta 
import yaml 
import pandas as pd 
from web3 import Web3 
WAREHOUSE_DSN = os.getenv("WAREHOUSE_DSN", "dbname=gnew user=gnew 
password=gnew host=postgres port=5432") 
SUBGRAPH_URL = os.getenv("SUBGRAPH_URL", 
"http://subgraph:8000/subgraphs/name/treasury") 
RPC_URL       
= os.getenv("RPC_URL", "http://localhost:8545") 
SAFE_ADDRESSES = [a.strip().lower() for a in 
os.getenv("SAFE_ADDRESSES", "0xSAFE_TREASURY_ADDRESS").split(",")] 
CHAIN_ID = int(os.getenv("CHAIN_ID", "100")) 
default_args = { 
"owner": "data-eng", 
"retries": 1, 
"retry_delay": timedelta(minutes=5), 
} 
def _pg(sql: str, params: tuple | None = None, many: bool=False, rows: 
list | None = None): 
    with psycopg2.connect(WAREHOUSE_DSN) as conn: 
        with conn.cursor() as cur: 
            if many and rows is not None: 
                cur.executemany(sql, rows) 
            else: 
                cur.execute(sql, params) 
 
def init_schema(): 
    here = os.path.dirname(__file__) 
    base = os.path.join(here, "..", "sql") 
    for f in ("001_schema.sql", "002_views.sql"): 
        with open(os.path.join(base, f), "r", encoding="utf-8") as fp: 
            _pg(fp.read()) 
 
def extract_subgraph(execution_date: datetime, **_): 
    # ventana [t-1d, t+1d] para robustez 
    start = (execution_date - 
timedelta(days=1)).replace(tzinfo=timezone.utc) 
    end   = (execution_date + 
timedelta(days=1)).replace(tzinfo=timezone.utc) 
    transport = RequestsHTTPTransport(url=SUBGRAPH_URL, verify=True, 
retries=3) 
    client = Client(transport=transport, 
fetch_schema_from_transport=False) 
    q = gql(""" 
    query Movements($from: BigInt!, $to: BigInt!, $safes: [ID!]) { 
      movements( 
        where: { timestamp_gte: $from, timestamp_lte: $to, safe_in: 
$safes } 
        first: 1000 
        orderBy: timestamp 
        orderDirection: asc 
      ) { 
        id 
        safe { id } 
        to 
        value 
        token 
        tokenAmount 
        txHash 
        blockNumber 
        timestamp 
        type 
      } 
    } 
    """) 
    rows = [] 
    after = int(start.timestamp()) 
    until = int(end.timestamp()) 
    # pagina única por simplicidad; extender si hay >1000 
    data = client.execute(q, variable_values={"from": after, "to": 
until, "safes": SAFE_ADDRESSES}) 
    for m in data.get("movements", []): 
        rows.append(( 
            bytes.fromhex(m["txHash"][2:]), 
            m["safe"]["id"].lower(), 
            (m["to"] or 
"0x0000000000000000000000000000000000000000").lower(), 
            int(m["value"] or 0), 
            (m["token"] or None).lower() if m["token"] else None, 
            int(m["tokenAmount"] or 0) if m["tokenAmount"] else None, 
            int(m["blockNumber"]), 
            
datetime.utcfromtimestamp(int(m["timestamp"])).replace(tzinfo=timezone
 .utc), 
            None 
        )) 
    if rows: 
        _pg(""" 
            insert into subgraph_movements (tx_hash, safe_address, 
to_address, value_wei, token_address, token_amount, block_number, ts, 
raw) 
            values (%s,%s,%s,%s,%s,%s,%s,%s,%s) 
            on conflict (tx_hash) do update set 
              safe_address=excluded.safe_address, 
              to_address=excluded.to_address, 
              value_wei=excluded.value_wei, 
              token_address=excluded.token_address, 
              token_amount=excluded.token_amount, 
              block_number=excluded.block_number, 
              ts=excluded.ts 
        """, many=True, rows=rows) 
 
def extract_rpc(execution_date: datetime, **_): 
    w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={"timeout": 
30})) 
    # Buscar logs de ExecutionSuccess en rango de bloques alrededor de 
fecha 
    day = execution_date.date() 
    # Se consulta última ventana de 2 días por simplicidad (ajustar a 
indexer real) 
    latest = w3.eth.block_number 
    # Heurística: ~5s por bloque → ~17280 bloques/día. Ajusta para tu 
red. 
    approx_day = 17280 
    from_block = max(0, latest - approx_day*2) 
    topic_exec_success = 
w3.keccak(text="ExecutionSuccess(bytes32,uint256)").hex() 
    for safe in SAFE_ADDRESSES: 
        logs = w3.eth.get_logs({ 
            "fromBlock": from_block, 
            "toBlock": "latest", 
            "address": Web3.to_checksum_address(safe), 
            "topics": [topic_exec_success] 
        }) 
        rows = [] 
        for lg in logs: 
            tx = w3.eth.get_transaction(lg["transactionHash"]) 
            blk = w3.eth.get_block(lg["blockNumber"]) 
            rows.append(( 
                bytes(tx.hash), 
                safe, 
                tx["to"].lower() if tx["to"] else None, 
                int(tx["value"]), 
                int(lg["blockNumber"]), 
                
datetime.utcfromtimestamp(blk["timestamp"]).replace(tzinfo=timezone.ut
 c), 
                {"logIndex": int(lg["logIndex"]), "data": 
lg["data"].hex() if hasattr(lg["data"], "hex") else lg["data"]} 
            )) 
        if rows: 
            _pg(""" 
              insert into rpc_movements (tx_hash, safe_address, 
to_address, value_wei, block_number, ts, raw) 
              values (%s,%s,%s,%s,%s,%s,%s) 
              on conflict (tx_hash) do update set 
                safe_address=excluded.safe_address, 
                to_address=excluded.to_address, 
                value_wei=excluded.value_wei, 
                block_number=excluded.block_number, 
                ts=excluded.ts 
            """, many=True, rows=rows) 
 
def normalize_and_load(**_): 
    # Cargar plan de cuentas y reglas 
    cfg_path = os.path.join(os.path.dirname(__file__), "..", "config", 
"chart_of_accounts.yaml") 
    with open(cfg_path, "r", encoding="utf-8") as fp: 
        cfg = yaml.safe_load(fp) 
 
    # Upsert cuentas 
    for acc in cfg["accounts"]: 
        _pg(""" 
            insert into accounts (code, name, type) values (%s,%s,%s) 
            on conflict (code) do update set name=excluded.name, 
type=excluded.type 
        """, (acc["code"], acc["name"], acc["type"])) 
 
    # Traer movimientos nuevos aún no reflejados en ledger_entries 
    q = """ 
      with base as ( 
        select s.tx_hash, s.safe_address, s.to_address, s.value_wei, 
s.ts 
        from subgraph_movements s 
        where not exists (select 1 from ledger_entries le where 
le.tx_hash=s.tx_hash) 
      ) 
      select * from base 
    """ 
    import pandas as pd 
    with psycopg2.connect(WAREHOUSE_DSN) as conn: 
        df = pd.read_sql(q, conn) 
 
    if df.empty: 
        return 
 
    # Enriquecer naturaleza (inflow/outflow) 
    df["nature"] = df["value_wei"].apply(lambda v: "outflow" if int(v) 
>= 0 else "inflow")  # en Safe value suele ser gasto/reintegro 
    df["token"] = "native" 
 
    # Crear/actualizar contrapartes 
    cp_map = {} 
    for cp in cfg.get("counterparties", []): 
        try: 
            _pg(""" 
                insert into counterparties(address, name) values 
(%s,%s) 
                on conflict(address) do update set name=excluded.name 
            """, (cp["address"].lower(), cp["name"])) 
        except Exception: 
            pass 
        cp_map[cp["address"].lower()] = cp["name"] 
 
    # Aplicar reglas de mapeo 
    def pick_rule(row): 
        for r in cfg["mapping"]: 
            m = r["match"] 
            if m.get("nature") == row["nature"] and m.get("token") == 
row["token"]: 
                return r 
        return None 
 
    entries = [] 
    for _, r in df.iterrows(): 
        rule = pick_rule(r) 
        if not rule: 
            continue 
        amount = int(r["value_wei"]) / 1e18  # nativo → unidades 
        # DEBIT 
        entries.append(( 
            r["ts"].date(), 
            rule["debit"], 
            None, 
            abs(amount), 
            "GNEW", 
            "DEBIT", 
            f"Tx {r['tx_hash'].hex()} to {r['to_address'] or 
'unknown'}", 
            bytes(r["tx_hash"]), 
            CHAIN_ID, 
            r["safe_address"] 
        )) 
        # CREDIT 
        entries.append(( 
            r["ts"].date(), 
            rule["credit"], 
            None, 
            abs(amount), 
            "GNEW", 
            "CREDIT", 
            f"Tx {r['tx_hash'].hex()} to {r['to_address'] or 
'unknown'}", 
            bytes(r["tx_hash"]), 
            CHAIN_ID, 
            r["safe_address"] 
        )) 
 
    if entries: 
        _pg(""" 
          insert into ledger_entries (entry_date, account_code, 
counterparty_id, amount, currency, direction, description, tx_hash, 
chain_id, safe_address) 
          values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) 
        """, many=True, rows=entries) 
 
def reconcile(**_): 
    # 100% conciliación: no debe haber diferencias 
    with psycopg2.connect(WAREHOUSE_DSN) as conn, conn.cursor() as 
cur: 
        cur.execute("select count(*) from v_recon_diffs") 
        diffs = cur.fetchone()[0] 
        if diffs != 0: 
            raise RuntimeError(f"Conciliación fallida: {diffs} 
diferencias entre subgraph y rpc") 
        # Además, validar que cada tx en ledger existe en subgraph 
        cur.execute(""" 
          select count(*) from ledger_entries le 
          where not exists (select 1 from subgraph_movements s where 
s.tx_hash=le.tx_hash) 
        """) 
        missing = cur.fetchone()[0] 
        if missing != 0: 
            raise RuntimeError(f"Ledger incluye {missing} tx no 
trazables por txid") 
 
def export_monthly(execution_date: datetime, **_): 
    # Export CSV + XBRL del mes anterior 
    period_end = (execution_date.replace(day=1) - 
timedelta(days=1)).date() 
    period_start = (period_end.replace(day=1)) 
    with psycopg2.connect(WAREHOUSE_DSN) as conn: 
        df = pd.read_sql(""" 
          select * from v_monthly_trial_balance where period=%s 
        """, conn, params=(period_start,)) 
    outdir = os.getenv("EXPORT_DIR", "/tmp/exports") 
    os.makedirs(outdir, exist_ok=True) 
    csv_path = os.path.join(outdir, 
f"trial_balance_{period_start}.csv") 
    df.to_csv(csv_path, index=False) 
 
    # XBRL minimalista 
    from lxml import etree 
    NS = { 
        "xbrli": "http://www.xbrl.org/2003/instance", 
        "link": "http://www.xbrl.org/2003/linkbase", 
        "xlink": "http://www.w3.org/1999/xlink", 
    } 
    root = etree.Element("{http://www.xbrl.org/2003/instance}xbrl", 
nsmap=NS) 
    context = etree.SubElement(root, 
"{http://www.xbrl.org/2003/instance}context", id="C1") 
    entity = etree.SubElement(context, 
"{http://www.xbrl.org/2003/instance}entity") 
    etree.SubElement(entity, 
"{http://www.xbrl.org/2003/instance}identifier", 
scheme="https://gnew.org").text = "GNEW-DAO" 
    period = etree.SubElement(context, 
"{http://www.xbrl.org/2003/instance}period") 
    etree.SubElement(period, 
"{http://www.xbrl.org/2003/instance}startDate").text = 
str(period_start) 
    etree.SubElement(period, 
"{http://www.xbrl.org/2003/instance}endDate").text   = str(period_end) 
    # Facts (ejemplo: una fila por cuenta) 
    for _, row in df.iterrows(): 
        fact = etree.SubElement(root, "balance", contextRef="C1", 
unitRef="u-GNEW")  # elemento genérico 
        fact.set("account", row["account_code"]) 
        fact.text = str(row["balance"]) 
    unit = etree.SubElement(root, 
"{http://www.xbrl.org/2003/instance}unit", id="u-GNEW") 
    measure = etree.SubElement(unit, 
"{http://www.xbrl.org/2003/instance}measure") 
    measure.text = "iso4217:GNEW" 
 
    xbrl_path = os.path.join(outdir, 
f"trial_balance_{period_start}.xbrl") 
    with open(xbrl_path, "wb") as fp: 
        fp.write(etree.tostring(root, xml_declaration=True, 
encoding="UTF-8", pretty_print=True)) 
 
    print(f"[EXPORT] CSV: {csv_path}") 
    print(f"[EXPORT] XBRL: {xbrl_path}") 
 
with DAG( 
    dag_id="treasury_ledger", 
    default_args=default_args, 
    schedule="0 2 * * *",  # diario 
    start_date=datetime(2025, 1, 1), 
    catchup=True, 
    max_active_runs=1, 
    tags=["treasury","accounting","reconciliation"] 
) as dag: 
 
    t_init = PythonOperator(task_id="init_schema", 
python_callable=init_schema) 
 
    t_subgraph = PythonOperator( 
        task_id="extract_subgraph", 
        python_callable=extract_subgraph, 
    ) 
 
    t_rpc = PythonOperator( 
        task_id="extract_rpc", 
        python_callable=extract_rpc, 
    ) 
 
    t_load = PythonOperator( 
        task_id="normalize_and_load", 
        python_callable=normalize_and_load, 
    ) 
 
    t_recon = PythonOperator( 
        task_id="reconcile", 
        python_callable=reconcile, 
    ) 
 
    t_export = PythonOperator( 
        task_id="export_monthly", 
        python_callable=export_monthly, 
    ) 
 
    t_init >> [t_subgraph, t_rpc] >> t_load >> t_recon >> t_export 
 
 
