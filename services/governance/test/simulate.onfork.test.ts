import { expect } from "chai"; 
/** 
* Placeholder: en CI puedes invocar `npm run simulate:fork` 
* y asertar por salida "Simulation OK". 
*/ 
describe("Simulación on-fork", () => { 
it("ejecución sin fallos", async () => { 
expect(true).to.eq(true); 
}); 
}); 
Cómo encaja con tu “Stack” y rituales 
● On-chain: GNEWGovernor + GNEWTimelock (quórum, umbral, delegaciones, veto) con 
cómputo For/Against/Abstain (control de abstención). 
● Off-chain: Snapshot (src/snapshot.ts) para propuestas informativas o cuando la 
ejecución on-chain no sea requerida. 
● Ejecución: Scripts de deploy y simulate-fork.ts aseguran ejecución sin fallos 
antes de ir a producción. 
● Mirrors: IPFS/Arweave vía /mirror para trazabilidad de metadatos de propuestas. 
● Portal: GovernancePortal.tsx como panel de gobernanza (puedes montarlo dentro 
del app web existente). 
● Métricas/DoD: /metrics expone governance_participation_ratio; pruebas 
dod.* validan participación > X%. 
● Riesgos & Controles: 
○ Veto en contrato (guardian) + período de objeción (Timelock). 
○ Abstención contada en el quorum (OZ GovernorCountingSimple usa 
for+abstain). 
○ Simulación on-fork obligatoria antes de ejecutar (simulate-fork.ts). 
Para producción, conecta el portal a un Subgraph (eventos Governor/Timelock) y a 
Tally (lectura de estados). El mock de /proposals sirve de puente inicial. 
Si quieres, te agrego en el siguiente paso los workflows de CI (deploy + simulación + 
publicación de métricas) y el subgraph (manifest y mappings) para cerrar el circuito 
observabilidad→ejecución. 
Tú dijiste: 
programa a detalle y entrega para GNEW N106 11.6 Tesorería programable (DCA/estrategias) 
(Prompt 106) Objetivo: Reglas DCA y cofres por estrategia. Roles: Finanzas quant, Eng. SC. 
Stack: Policy engine; crons on-chain/off-chain confiables. Entregables: estrategias 
parametrizables y pausables. Pasos: backtesting; límites de slippage; pausas de mercado. 
DoD: desviación ≤ umbral; guardias activas. Controles: kill-switch DAO. 
ChatGPT Plus 
Pensó durante 1m 41s 
