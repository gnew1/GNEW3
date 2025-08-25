export type ComparePayload = {
  options: Array<{ id: string; title: string }>;
  voters: Array<{ id: string; weight?: number; credits?: number; segment?: string }>;
  ballots: Array<{ voterId: string; scores: Record<string, number>; ts?: number }>;
  variants?: Array<string>;
  qv_cost?: string;
  qv_credits_default?: number;
  perturbations?: number;
  perturb_strength?: number;
};

export async function compareVariants(payload: ComparePayload): Promise<any> {
  const res = await fetch("/api/variants/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Compare failed: ${res.status}`);
  return res.json();
}
