import { Counter, Gauge, register, collectDefaultMetrics } from 
"prom-client"; 
 
collectDefaultMetrics(); 
 
export const serviceInfo = new Gauge({ 
  name: "service_info", 
  help: "labels", 
  labelNames: ["service_name", "environment"] 
}); 
serviceInfo.labels("governance", process.env.ENVIRONMENT || 
"dev").set(1); 
 
export const participationGauge = new Gauge({ 
  name: "governance_participation_ratio", 
  help: "Participation ratio (for+abstain)/totalSupply for last 
proposal", 
  labelNames: ["proposal_id"] 
}); 
 
export const mirrorCounter = new Counter({ 
name: "governance_mirrors_total", 
help: "Total mirrors to IPFS/Arweave", 
labelNames: ["target"] 
}); 
export function setParticipation(proposalId: string, ratio: number) { 
participationGauge.labels(proposalId).set(ratio); 
} 
