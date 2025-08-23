import os 
import sys 
import psycopg2 
import pandas as pd 
from datetime import date 
from lxml import etree 
 
WAREHOUSE_DSN = os.getenv("WAREHOUSE_DSN", "dbname=gnew user=gnew 
password=gnew host=postgres port=5432") 
 
def export(period: date): 
    with psycopg2.connect(WAREHOUSE_DSN) as conn: 
        df = pd.read_sql("select * from v_monthly_trial_balance where 
period=%s", conn, params=(period,)) 
    outdir = os.getenv("EXPORT_DIR", "/tmp/exports") 
    os.makedirs(outdir, exist_ok=True) 
    csv_path = os.path.join(outdir, f"trial_balance_{period}.csv") 
    df.to_csv(csv_path, index=False) 
 
    # XBRL (igual que en DAG) 
NS = {"xbrli":"http://www.xbrl.org/2003/instance"} 
root = etree.Element("{http://www.xbrl.org/2003/instance}xbrl", 
nsmap=NS) 
# ... (idéntico al DAG) 
print(csv_path) 
if __name__ == "__main__": 
y, m = int(sys.argv[1].split("-")[0]), 
int(sys.argv[1].split("-")[1]) 
export(date(y, m, 1)) 
