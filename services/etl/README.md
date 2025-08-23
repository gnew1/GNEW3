# ETL Contable On‑chain (Subledger) 
## Flujo 
1. **Subgraph** indexa `ExecutionSuccess/Failure` del Gnosis Safe de 
tesorería (operativo, grants, R&D). 
2. **DAG Airflow** extrae de Subgraph y en paralelo del RPC (fuente de 
verdad), normaliza a **ledger_entries** aplicando el **mapa de 
cuentas**, y ejecuta **conciliación 100%**. 
3. Si la conciliación pasa, genera **export mensual** en **CSV** y 
**XBRL**. 
4. **Controles**: - **Doble firma de cierre** (`close_approvals`) con roles `FINANCE` 
+ `AUDITOR`. - **Inmutabilidad** por triggers al marcar `closes.state = FINAL`. 
## Variables de entorno - `WAREHOUSE_DSN` PostgreSQL. - `SUBGRAPH_URL` URL del subgraph. - `RPC_URL` nodo para logs. - `SAFE_ADDRESSES` coma‑separado de Safes. - `CHAIN_ID` id de cadena. - `EXPORT_DIR` ruta de salida. 
## Operativa de cierre 
```sql -- Crear cierre del mes anterior 
insert into closes(period_start, period_end, state) values 
('2025-07-01','2025-07-31','PENDING') returning id; -- Firmas 
insert into close_approvals(close_id, approver, role) values 
($ID,'alice','FINANCE'); 
insert into close_approvals(close_id, approver, role) values 
($ID,'bob','AUDITOR'); -- Finalizar 
select finalize_close($ID); 
Una vez FINAL, los triggers bloquean cualquier mutación de períodos cerrados. --- 
Ruta completa: `./services/etl/tests/test_reconciliation.py` 
```python 
import os 
import psycopg2 
def test_views_exist(): 
dsn = os.getenv("WAREHOUSE_DSN_TEST","dbname=gnew user=gnew 
password=gnew host=postgres port=5432") 
with psycopg2.connect(dsn) as conn, conn.cursor() as cur: 
cur.execute("select 1 from information_schema.views where 
table_name='v_recon_diffs'") 
assert cur.fetchone()[0] == 1 
