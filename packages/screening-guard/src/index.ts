export async function ensureNotSanctioned(subjectId: string) { 
const r = await 
fetch(`${process.env.SCREENING_API}/v1/screening/subjects/${subjectId}
 `, { cache: "no-store" }); 
if (!r.ok) throw new Error("SCREENING_API_ERROR"); 
const subj = await r.json(); 
if (subj.status === "blocked") throw new Error("SANCTIONS_BLOCKED"); 
if (subj.status === "review") throw new Error("SANCTIONS_REVIEW"); 
} 
Ejemplo de uso (router de pagos/airdrops) 
