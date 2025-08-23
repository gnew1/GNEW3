import pandas as pd 
from typing import Tuple, Dict 
 
def compute_vat_es(df: pd.DataFrame) -> Tuple[Dict[str,float], 
pd.DataFrame]: 
    """ 
    Espera columnas: 
['date','country_code','type','customer_tax_id','customer_is_business'
 ,'category','amount_net','vat_rate'] 
    Aplica reglas base: estándar 21%, reducidas por categoría si 
'vat_rate' viene vacía pero category coincide. 
    Reverse-charge: si EU-B2B con VAT-ID (aquí simplificado: 
country_code != 'ES' and customer_is_business and customer_tax_id != 
None) => 0%. 
    """ 
    df = df.copy() 
    df["vat_rate"] = df["vat_rate"].fillna(0.21) 
    # reducidas por categoría (ejemplo) 
    
df.loc[df["category"].isin(["hosteleria","transporte","entradas"]), 
"vat_rate"] = df["vat_rate"].where(df["vat_rate"].notna(), 0.10) 
    df.loc[df["category"].isin(["libros","alimentos_basicos"]), 
"vat_rate"] = df["vat_rate"].where(df["vat_rate"].notna(), 0.04) 
 
    # reverse-charge EU B2B 
    cond_rc = (df["country_code"] != "ES") & 
(df["customer_is_business"]) & (df["customer_tax_id"].notna()) 
    df.loc[cond_rc, "vat_rate"] = 0.0 
 
    df["vat_amount"] = (df["amount_net"] * df["vat_rate"]).round(2) 
 
    totals = { 
        "base_standard": 
float(df.loc[df["vat_rate"]==0.21,"amount_net"].sum().round(2)), 
        "vat_standard": 
float(df.loc[df["vat_rate"]==0.21,"vat_amount"].sum().round(2)), 
"base_reduced": 
float(df.loc[df["vat_rate"].isin([0.10,0.04]),"amount_net"].sum().roun
 d(2)), 
"vat_reduced": 
float(df.loc[df["vat_rate"].isin([0.10,0.04]),"vat_amount"].sum().roun
 d(2)) 
} 
return totals, df 
