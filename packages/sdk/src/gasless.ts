import { ethers } from "ethers"; 
export type Ticket = { 
user: string; to: string; selector: string; 
maxValueWei: string; maxGasLimit: number; nonce: number; 
validUntil: number; validAfter: number; policyId: number; chainId: 
number; 
}; 
export type SponsorResponse = { ticket: Ticket; sig: string; signer: 
string }; 
export async function requestTicket(endpoint: string, ask: { 
user: string; to: string; selector: string; chainId: number; 
policyId: number; 
}): Promise<SponsorResponse> { 
const r = await fetch(`${endpoint}/ticket`, { 
method: "POST", 
headers: { "content-type": "application/json" }, 
body: JSON.stringify(ask) 
}); 
if (!r.ok) throw new Error(await r.text()); 
return r.json(); 
} 
/** 
* Empaqueta paymasterAndData = paymasterAddr | abi.encode(ticket) | 
sig 
* WARNING: Ajustar layout EXACTO al contrato Paymaster del repo. 
*/ 
export function encodePaymasterAndData(paymasterAddr: string, t: 
Ticket, sig: string): string { 
const abi = new ethers.AbiCoder(); 
const data = abi.encode( 
["tuple(address,address,bytes4,uint256,uint256,uint256,uint48,uint48,u
 int256,uint256)","bytes"], 
[[t.user, t.to, t.selector, t.maxValueWei, t.maxGasLimit, t.nonce, 
t.validUntil, t.validAfter, t.policyId, t.chainId], sig] 
); 
return paymasterAddr + data.slice(2); 
} 
5.4 Fallback OpenGSN (opcional) 
Ruta: /contracts/paymasters/GnewGsnPaymaster.sol (extiende BasePaymaster de 
OpenGSN) 
Política equivalente a la de 4337: allowlist por to+selector, caps y chequeo de firmas del 
Sponsor. 
6) Pruebas / Definition of Done (DoD) 
● Funcional: 
○ Onboarding + 3 flujos críticos (voto, claim recompensa < 0.02 ETH, propuesta 
governance) patrocinados sin prompts de gas. 
○ Cuotas: rechazo coherente al superar daily cap; mensaje de error UX claro. 
○ Allowlist: llamada a método no permitido → revert controlado. 
○ Kill‑switch: pausa y reanudación en < 5 min documentada en runbook. 
● Rendimiento/UX: 
○ P95 latencia de envío‑a‑minado < 3s en L2 target (con Bundler confiable). 
○ 0 fallos por “out of deposit” bajo carga nominal (alertas previas). 
● Seguridad: 
○ Tests de replay (nonce ticket), cadena incorrecta, firma inválida, selector 
malicioso, griefing por fragmentación de txs. 
○ Lint + Slither/Mitigation + revisión interna SC. 
● Observabilidad: 
○ Dashboards: gasto diario (por red, política, guild), reintentos, rechazos y causas, 
depósitos y márgenes. 
○ Alertas: 50/80/100% de presupuesto, depósito < X días, error rate > 2% (5m), 
P95 > 5s (15m). 
● Entorno limpio: 
○ make up levanta: Sponsor, Redis, Bundler simulado, Grafana/Prometheus; 
make demo ejecuta los 3 flujos. 
● Docs: 
○ Docusaurus: “GAS‑less” con diagrama, tabla de políticas y ejemplos de SDK. 
7) DevOps & despliegue 
● CI/CD: GitHub Actions con matrices (node/solc). Jobs: lint, unit, sc‑tests, build 
imágenes, SBOM (Syft), firma (Cosign). 
● Infra: 
○ Bundler gestionado o propio (Helm chart /infra/helm/bundler). 
○ Sponsor /infra/helm/sponsor (HPA on CPU/RPS). 
○ Redis HA, Postgres para políticas/auditoría. 
○ Secrets vía OIDC + Vault (SPONSOR_PRIVATE_KEY rotativa cada 7 días). 
● Redes objetivo (fase 1): Base, Arbitrum, Polygon. 
● Observabilidad: OpenTelemetry → Prometheus/Grafana 
(/infra/grafana/dashboards/gasless.json). 
8) Seguridad y controles 
● Controles de gasto: presupuestos por política/guild; cambios vía propuesta DAO + 
timelock; multi‑sig para urgencias. 
 
● Abuso: device/IP heurístico (off‑chain), cuotas on‑chain por address, pruebas de 
humanidad opcionales, listas negras dinámicas. 
 
● Pérdida de clave Sponsor: rotación inmediata (endpoint /rotate), setSponsorSigner 
en Paymaster, invalidación de tickets previos (validUntil corto). 
 
● Auditoría: logs firmados (hash diario), export a almacenamiento WORM. 
 
● Compatibilidad legal: limitar patrocinio a acciones de governance/uso interno; 
trazabilidad y consentimiento. 
 
 
9) Roadmap incremental 
● Sprint 1: Paymaster MVP + Sponsor + SDK + allowlist mínima (voto, claim). 
 
● Sprint 2: Dashboards, alertas, kill‑switch, quotas por usuario y por guild. 
 
● Sprint 3: Fallback GSN, pruebas de estrés, refuerzo anti‑abuso, docs públicas y guías 
de integración para guilds. 
 
 
10) Matriz de límites (ejemplo inicial) 
Acción Contrato Selector MaxValu
 e 
MaxGa
 s 
Cap 
usuario/día 
Política 
Votar 0xVoting… 0x1234567
 8 
0 600k 10 v1‑critica
 l 
Claim 
recompensa 
0xRewards
 … 
0xabcdef0
 1 
0.02 ETH 500k 3 v1‑critica
 l 
Crear 
propuesta 
0xGov… 0xdeadbee
 f 
0 800k 2 v1‑critica
 l 
 
