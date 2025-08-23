// Ejemplo de uso en pagos: compone con N134 (sanciones) y N135 (OPA) 
import { Request, Response, NextFunction } from "express"; 
export async function jxGate(req: Request, res: Response, next: 
NextFunction) { 
const { country_from, product_type, amount, currency } = req.body; 
const subject = req.headers["x-subject-id"] as string; 
const isPEP = (req.headers["x-pep"] as string) === "true"; 
const sanctionsStatus = (req.headers["x-sanctions-status"] as 
string) || "clear"; 
const kycLevel = (req.headers["x-kyc-level"] as string) || "NONE"; 
const url = process.env.JX_API!; 
const body = { country: country_from, productType: product_type, 
amount, currency, isPEP, sanctionsStatus, kycLevel }; 
const r = await fetch(`${url}/v1/jx/resolve`, { method:"POST", 
headers:{ "Content-Type":"application/json" }, body: 
JSON.stringify(body) }); 
const d = await r.json(); 
if (d.obligations?.includes("block") || 
d.obligations?.includes("block_embargo")) 
return res.status(451).json({ error: "blocked_by_jurisdiction" }); 
// Límite por nivel 
if (amount > d.limits.tx_max) return res.status(422).json({ error: 
"over_tx_max", limit: d.limits.tx_max, currency: d.limits.currency }); 
// Add facts for OPA (N135) 
req.headers["x-jx-vat"] = String(d.tax.vatRate); 
req.headers["x-jx-level"] = String(d.kyc.level); 
req.headers["x-jx-version"] = String(d.version); 
next(); 
} 
