import { ethers } from "hardhat"; 
async function main() { 
const [gov] = await ethers.getSigners(); 
const Registry = await ethers.getContractFactory("BudgetRegistry"); 
const registry = await Registry.deploy(gov.address); 
const Vault = await ethers.getContractFactory("BudgetVault"); 
const vault = await Vault.deploy(await registry.getAddress(), 
gov.address); 
console.log("BudgetRegistry:", await registry.getAddress()); 
console.log("BudgetVault   :", await vault.getAddress()); 
// Recuerda autorizar el Vault (o Governor) para llamar a 
increaseActual en el Registry si aplicas un wrapper; 
// en esta versión, Governor/owner ya están autorizados. 
} 
main().catch(e => { console.error(e); process.exit(1); }); 
Entrega alineada al Prompt 108 
● Stack: propuestas (YAML → CID) + contratos (Registry/Vault) + dashboard y servicio 
KPIs. 
● Entregables: plantilla de budget, feed consolidado de ejecución (events→KPIs), 
alertas/metas (gauge). 
● Pasos: aprobar lotes (tranches), seguimiento en panel, reforecast versionado. 
● DoD: endpoint /kpi con delta vs plan, PDF trimestral; tests covering tranches y 
spending. 
● Controles: circuito de permisos (Governor/Timelock), kill-switch en Vault, trazabilidad 
para auditoría externa voluntaria. 
¿Quieres que añada reglas de Prometheus (alertas por delta>umbral) y un script que convierta 
la plantilla YAML a llamadas createBudget/setPlan automáticamente? 
Tú dijiste: 
programa a detalle y entrega para GNEW N109 11.9 Cumplimiento fiscal (Prompt 109) Objetivo: 
Reportes de impuestos (IVA/IS/IRPF) y 1099/CRS. Roles: Fiscalidad, Back, Data. Stack: Motor 
fiscal; generador de informes. Entregables: declaraciones por país, anexos. DoD: validación 
sintáctica y de reglas. Controles: retenciones automáticas, consentimientos. 
ChatGPT Plus 
Pensó durante 45s 
