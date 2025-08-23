import os, csv, json 
from datetime import datetime 
from jinja2 import Template 
from lxml import etree 
from .validators import validate_payload 
from typing import Dict, List 
 
def ensure_dir(path: str): 
    os.makedirs(os.path.dirname(path), exist_ok=True) 
 
def gen_iva_es_303(out_dir: str, taxpayer_vat: str, period: str, 
totals: Dict[str,float]) -> Dict: 
    payload = {"period": period, "taxpayer_vat": taxpayer_vat, 
"totals": totals} 
    errs = validate_payload("IVA-ES-303", payload) 
    if errs: return {"ok": False, "errors": errs} 
    path = os.path.join(out_dir, f"iva_es_303_{period}.json") 
    ensure_dir(path) 
    with open(path, "w", encoding="utf-8") as fp: 
        json.dump(payload, fp, indent=2) 
    return {"ok": True, "path": path} 
 
def gen_is_es_pagos_fracc(out_dir: str, fy: int, q: int, base: float, 
rate: float) -> Dict: 
    amount = round(base * rate, 2) 
    payload = {"fy": fy, "q": q, "base": base, "rate": rate, "amount": 
amount} 
    errs = validate_payload("IS-ES-PagosFracc", payload) 
    if errs: return {"ok": False, "errors": errs} 
    path = os.path.join(out_dir, 
f"is_es_pagos_fracc_FY{fy}_Q{q}.json") 
    ensure_dir(path) 
    with open(path, "w", encoding="utf-8") as fp: 
        json.dump(payload, fp, indent=2) 
    return {"ok": True, "path": path} 
 
def gen_irpf_111(out_dir: str, fy: int, q: int, records: List[Dict]) -> Dict: 
    w_total = round(sum(r.get("withheld",0.0) for r in records), 2) 
    payload = {"fy": fy, "q": q, "withheld_total": w_total, "records": 
records} 
    errs = validate_payload("IRPF-111", payload) 
    if errs: return {"ok": False, "errors": errs} 
    path = os.path.join(out_dir, f"irpf_111_FY{fy}_Q{q}.json") 
    ensure_dir(path) 
    with open(path, "w", encoding="utf-8") as fp: 
        json.dump(payload, fp, indent=2) 
    return {"ok": True, "path": path} 
 
def gen_1099nec_csv(out_dir: str, tax_year: int, payer: Dict, payee: 
Dict, box1: float, box4: float=0.0) -> Dict: 
    payload = {"tax_year": tax_year, "payer": payer, "payee": payee, 
"box1": box1, "box4": box4} 
    errs = validate_payload("1099NEC", payload) 
    if errs: return {"ok": False, "errors": errs} 
    path = os.path.join(out_dir, 
f"1099NEC_{payee['payee_tin']}_{tax_year}.csv") 
    ensure_dir(path) 
    with open(path, "w", newline="", encoding="utf-8") as fp: 
        w = csv.writer(fp) 
        
w.writerow(["TaxYear","PayerName","PayerTIN","PayeeName","PayeeTIN","N
 onemployeeComp","FedTaxWithheld"]) 
        w.writerow([tax_year, payer["payer_name"], payer["payer_tin"], 
payee["payee_name"], payee["payee_tin"], f"{box1:.2f}", 
f"{box4:.2f}"]) 
    return {"ok": True, "path": path} 
 
def gen_crs_xml(out_dir: str, reporting_period: str, accounts: 
List[Dict]) -> Dict: 
    # CRS real es complejo; generamos XML simplificado con tags clave 
    payload = {"reporting_period": reporting_period, "accounts": 
accounts} 
    errs = validate_payload("CRS_XML", payload) 
    if errs: return {"ok": False, "errors": errs} 
    root = etree.Element("CRSReport", version="1.0") 
    etree.SubElement(root, "ReportingPeriod").text = reporting_period 
    accs = etree.SubElement(root, "Accounts") 
    for a in accounts: 
        acc = etree.SubElement(accs, "Account") 
        for k in 
["account_number","holder_name","holder_tin","holder_country","balance
 "]: 
            etree.SubElement(acc, k).text = str(a.get(k,"")) 
    xml_bytes = etree.tostring(root, pretty_print=True, 
xml_declaration=True, encoding="UTF-8") 
    path = os.path.join(out_dir, f"CRS_{reporting_period}.xml") 
    ensure_dir(path) 
    with open(path, "wb") as fp: 
        fp.write(xml_bytes) 
    return {"ok": True, "path": path, "bytes": xml_bytes} 
 
 
