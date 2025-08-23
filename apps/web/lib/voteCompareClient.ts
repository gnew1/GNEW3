export type ComparePayload = { 
  options: Array<{ id: string; title: string }>; 
  voters: Array<{ id: string; weight?: number; credits?: number; 
segment?: string }>; 
  ballots: Array<{ voterId: string; scores: Record<string, number>; 
ts?: number }>; 
  variants?: Array<"one_person_one_vote" | "token_weighted" | 
"quadratic_voting">; 
  qv_cost?: "sqrt" | "quadratic"; 
  qv_credits_default?: number; 
  perturbations?: number; 
  perturb_strength?: number; 
}; 
 
export async function compareVariants(payload: ComparePayload) { 
  const r = await fetch("/api/vote-compare", { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(payload), 
  }); 
  if (!r.ok) throw new Error(`Compare failed: ${r.status}`); 
  return await r.json(); 
} 
 
