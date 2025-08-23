export function computeDueAt(region: string): Date { 
const now = new Date(); 
const days = region === "EU" ? 30 : 45; // ejemplo; configurable 
const d = new Date(now.getTime() + days*24*60*60*1000); 
return d; 
} 
Interfaz de conectores y orquestador 
