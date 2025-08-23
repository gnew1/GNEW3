# N108 — Presupuestos DAO (Planificación y ejecución on-chain) 
## Objetivo 
Planificación **anual/quarterly** con ejecución on-chain, reforecast y 
KPIs de gasto. 
## Componentes - **BudgetRegistry.sol**: registro fuente de verdad (plan, estado, 
reforecast, actual). - **BudgetVault.sol**: cofres por **trimestre/categoría** mediante 
allowances y **tranches**; spending con control de límites. - **Dashboard**: `BudgetDashboard.tsx` con burn, delta y PDF 
trimestral. - **Servicio KPIs**: agrega on-chain y expone `/kpi` + 
`/report/quarterly.pdf`. 
## Flujo (Pasos) 
1. **Propuesta** (Gobernanza): plantilla YAML → CID en `createBudget` 
+ categorías. 
2. **Aprobación**: `approve()` → `activate()` por Governor/Timelock. 
3. **Lotes/Tranches**: por trimestre y categoría (`releaseTranche`) → 
allowances en Vault. 
4. **Ejecución**: Safe/controller o spenders delegados ejecutan pagos 
(`spendERC20/ETH`); Registry actualiza `actual`. 
5. **Seguimiento**: Dashboard: **burn ratio** y **delta vs plan**; 
Prometheus: `budget_delta_bps`, `budget_burn_ratio`. 
6. **Reforecast**: `reforecast(id,q,cat,newAmount,reason)` con 
versionado; se re-publica narrativa. 
7. **Reporte**: `/report/quarterly.pdf` (DoD: **report trimestral**) y 
verificación de delta ≤ X%. 
## Controles - **Kill-switch**: `pauseAll()` por Governor (Vault). 
- **Auditoría externa (voluntaria)**: publicar informe con hash/CID en 
narrativa (no-custodial). - **Trazabilidad**: eventos `BudgetCreated`, `TrancheReleased`, 
`Spent`, `Reforecast`, `ActualIncreased`. 
## Métricas/DoD - **Delta vs plan ≤ X%**: `budget_delta_bps` por categoría + total; 
alertas Prometheus opcionales. - **Reporte trimestral**: PDF descargable desde el panel (cumplimiento 
DoD). 
