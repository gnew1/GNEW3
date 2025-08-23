# Mapeo Budget→Tax (para KPIs de gasto y declaraciones) - **Categorías Budget (N108)** → **Códigos fiscales**: - `ops` → ventas/servicios (IVA devengado). - `grants` → generalmente **exentos** (ver jurisdicción). - `rnd` → gastos deducibles (no generan IVA devengado; puede haber 
IVA soportado). - **Flujo**: 
1. Subledger (N102) exporta `country_code`, `type`, `category`, 
`amount_net`. 
2. Tax Engine agrega por periodo y alimenta generación de 
IVA/IS/IRPF. 
3. KPIs de delta/burn (N108) se cruzan con bases imponibles para 
revisar **desviación ≤X%** también en impuestos. 
