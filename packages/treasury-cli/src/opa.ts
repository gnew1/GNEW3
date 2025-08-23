import axios from "axios"; 
import { PolicyDecision, PolicyInput } from "./types.js"; 
export async function evaluatePolicy( 
opaUrl: string, 
input: PolicyInput 
): Promise<PolicyDecision> { 
const { data } = await axios.post<{ result: PolicyDecision 
}>(opaUrl, { input }); 
return data.result; 
} 
export async function logDecision(opaAuditUrl: string | undefined, 
payload: unknown) { 
if (!opaAuditUrl) return; 
try { 
await axios.post(opaAuditUrl, payload); 
} catch { 
// best-effort logging 
} 
} 
