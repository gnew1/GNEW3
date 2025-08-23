# N109 — Cumplimiento fiscal (IVA/IS/IRPF, 1099/CRS) 
## Objetivo 
Generar **reportes de impuestos** por país y anexos (1099, CRS) con 
**validación** sintáctica y de reglas; retenciones automáticas y 
**consentimientos** trazados. 
## Componentes - **Tax Engine (FastAPI)**: - `/vat/es/compute` → Totales **IVA 303** (ES) + JSON listo para 
modelo. - `/is/es/pago-fraccionado` → avance trimestral de IS (rate 
configurable). - `/irpf/es/111` → sumario de retenciones IRPF de autónomos. - `/withholding/compute` → motor de **retenciones** (ES/US inicial). - `/us/1099nec` → CSV 1099-NEC (box1/box4). - `/crs/xml` → XML simplificado CRS (para pipeline a validación 
oficial). - `/consent/store` y `/consent/check` → **consentimientos** 
(W-9/GDPR/CRS KYC). 
- `/download` → descarga de artefactos. - **Rules** (`rules/*.yaml`) parametrizan tasas y validaciones por 
jurisdicción. - **Panel UI** (`TaxCompliancePanel.tsx`) desde el portal web. - **Métricas** Prometheus: `taxengine_requests_total`, 
`taxengine_withholding_rate`. 
## Datos de entrada - **Subledger (N102)**: CSV con columnas base (`/subledger/sample`). 
El ETL normaliza y agrega por periodo/país/categoría. 
## Pasos (operación) 
1. **Preparación**: poblar `rules/` y asegurar subledger del periodo 
(p. ej., `2025Q1`). 
2. **IVA ES**: POST a `/vat/es/compute` → `iva_es_303_2025Q1.json` 
(DoD: validado). 
3. **IRPF/IS**: generar `irpf_111_*.json` y 
`is_es_pagos_fracc_*.json`. 
4. **US 1099**: por proveedor → `/us/1099nec` (requiere W-9 o aplica 
backup withholding). 
5. **CRS**: construir `accounts[]` desde KYC y saldos → `/crs/xml`. 
Validar contra XSD oficial en el paso posterior del pipeline. 
6. **Retenciones automáticas**: integrar en payouts (N103) llamando a 
`/withholding/compute` antes de pagar; registrar consentimientos 
W-9/CRS. 
## DoD - **Validación sintáctica**: cada artefacto pasa 
`validators.validate_payload()` (y XML contra XSD si se provee). - **Validación de reglas**: motor de retenciones aplica tasas 
correctas según contexto (tests incluidos). - **Report trimestral**: conjuntos `*_2025Q*.json`/CSV/XML generados 
para el periodo. 
## Controles - **Retenciones automáticas** (IRPF/backup withholding) con 
motivo/porcentaje trazable. 
- **Consentimientos**: `/consent/store` y `/consent/check` 
obligatorios previo a generación/retención sensible. - **Auditoría externa**: artefactos firmables (hash) y reglas 
versionadas en `rules/`. 
> Nota: los formatos oficiales (SII/AEAT, IRS FIRE, CRS) varían; este 
módulo genera **artefactos puente** validados localmente y listos para 
ser mapeados a esquemas oficiales en el paso de filing externo. 
