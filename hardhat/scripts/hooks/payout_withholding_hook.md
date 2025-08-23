# Hook de retenciones en Payouts (N103) 
1) Antes de ejecutar un payout: - Llamar `POST /consent/check?subject_id=<payee>&kind=W9` (US) o 
`CRS_KYC` (CRS). - Llamar `POST /withholding/compute` con: 
```json 
{ 
"jurisdiction": "US", 
"payee_id": "vendor_42", 
"payee_tin": "123456789", 
"amount_gross": 1250.00, 
"context": {"w9":"true"} 
} 
2. Aplicar amount_withheld y registrar en el subledger una línea 
withholding_liability. 
3. En el cierre trimestral, agregar registros IRPF-111 o 1099NEC según corresponda. 
DoD: errores <0.1% en liquidación (ver N103) y validaciones fiscales OK. --- 
### Cómo encaja con GNEW y cumple Prompt 109 - **Stack**: Motor fiscal (FastAPI + reglas YAML) y **generador de 
informes** (JSON/CSV/XML).   - **Entregables**: plantillas y **declaraciones por país** (ES: 
IVA/IS/IRPF; US: 1099-NEC) + **anexos CRS**.   - **Pasos**: aprobar lotes (N108) → seguimiento (KPIs) → 
**reforecast**; aquí, ETL desde subledger (N102) y generación 
periódica.   - **DoD**: endpoints devuelven artefactos **validados** (sintaxis + 
reglas), tests de retenciones incluidos.   - **Controles**: **retenciones automáticas** en el hook de payouts y 
**consentimientos** trazados en SQLite (puedes migrar a Postgres).   
Si quieres, añado ahora los **workflows de CI** para validar esquemas 
con datos reales por entorno y un adaptador a los esquemas **XBRL** 
oficiales de tu jurisdicción prioritaria.