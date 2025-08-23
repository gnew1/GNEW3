/* Comparador de variantes de voto (1p1v, token-weighted, quadratic) 
Métricas: participación, concentración, equidad, robustez 
(perturbación) */ 
import crypto from "crypto"; 
export type Voter = { 
id: string; 
weight?: number;        
credits?: number;       
segment?: string;       
}; 
// p.ej. tokens o reputación (default 1) 
// para QV (default 9) 
// p.ej. "core", "newcomer", "guild-A" 
export type Option = { id: string; title: string }; 
export type Ballot = { 
voterId: string; 
// Para 1p1v: elegir 1 opción -> scores[opId]=1 
// Para Token / Quadratic: puntuar distribución de puntos -> 
scores[opId]>=0 
scores: Record<string, number>; 
ts?: number; 
}; 
export type Variant = 
| "one_person_one_vote" 
| "token_weighted" 
| "quadratic_voting"; 
export type CompareRequest = { 
options: Option[]; 
voters: Voter[]; 
ballots: Ballot[]; 
variants?: Variant[];          
// default: todas 
qv_cost?: "sqrt" | "quadratic"; // coste QV: votos = 
floor(sqrt(credits)) o coste = v^2 
qv_credits_default?: number;   // créditos por defecto si no se 
pasan (default 9) 
perturbations?: number;        
(default 250) 
perturb_strength?: number;     
perturbadas (default 0.1) 
}; 
export type VariantResult = { 
variant: Variant; 
// nº simulaciones de robustez 
// 0..1 fracción de balotas 
totals: Record<string, number>; 
normTotals: Record<string, number>; 
ranking: Array<{ optionId: string; score: number }>; 
winner: string; 
}; 
export type Metrics = { 
turnoutRate: number;       
giniByOption: number;      
(promedio) 
top10Share: number;        
más influyentes 
decisiveMargin: number;    
// % votantes con al menos 1 score > 0 
// desigualdad de aportes por opción 
// % aporte que proviene del 10% votantes 
// diferencia entre 1º y 2º sobre total 
disagreementRate: number;  // % de balotas con mass on perdedor 
sybilSensitivity: number;  // aumento de score top si se divide un 
votante en N 
}; 
export type Robustness = { 
stability: number; // 0..1, prob. de que el ganador se mantenga bajo 
perturbación 
avgWinnerDelta: number; // delta medio de score del ganador 
flipRate: number; // % de simulaciones donde cambia el ganador 
}; 
export type CompareResponse = { 
  hash: string; 
  summary: Array<{ 
    variant: Variant; 
    result: VariantResult; 
    metrics: Metrics; 
    robustness: Robustness; 
  }>; 
  options: Option[]; 
}; 
 
function byId<T extends { id: string }>(arr: T[]) { 
  const map = new Map<string, T>(); 
  arr.forEach((x) => map.set(x.id, x)); 
  return map; 
} 
 
function safeWeight(v: Voter) { 
  return Math.max(0, Number.isFinite(v.weight ?? 1) ? (v.weight ?? 1) 
: 1); 
} 
 
function onePersonOneVote(options: Option[], voters: Voter[], ballots: 
Ballot[]): VariantResult { 
  const totals: Record<string, number> = 
Object.fromEntries(options.map(o => [o.id, 0])); 
  for (const b of ballots) { 
    // 1p1v: tomar la opción con mayor score (empate -> repartir 1 
entre empatadas) 
    const entries = Object.entries(b.scores).filter(([k]) => k in 
totals); 
    if (!entries.length) continue; 
    const max = Math.max(...entries.map(([, v]) => v)); 
    const winners = entries.filter(([, v]) => v === max && v > 
0).map(([k]) => k); 
    if (!winners.length) continue; 
    const inc = 1 / winners.length; 
    winners.forEach((k) => (totals[k] += inc)); 
  } 
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1; 
  const normTotals = 
Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v / 
sum])); 
  const ranking = Object.entries(totals).sort((a, b) => b[1] - 
a[1]).map(([optionId, score]) => ({ optionId, score })); 
  return { variant: "one_person_one_vote", totals, normTotals, 
ranking, winner: ranking[0]?.optionId ?? options[0].id }; 
} 
 
function tokenWeighted(options: Option[], voters: Voter[], ballots: 
Ballot[]): VariantResult { 
  const vmap = new Map(voters.map(v => [v.id, v])); 
  const totals: Record<string, number> = 
Object.fromEntries(options.map(o => [o.id, 0])); 
  for (const b of ballots) { 
    const w = safeWeight(vmap.get(b.voterId) || { id: b.voterId, 
weight: 1 }); 
    for (const [k, s] of Object.entries(b.scores)) { 
      if (!(k in totals) || s <= 0) continue; 
      totals[k] += w * s; 
    } 
  } 
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1; 
  const normTotals = 
Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v / 
sum])); 
  const ranking = Object.entries(totals).sort((a, b) => b[1] - 
a[1]).map(([optionId, score]) => ({ optionId, score })); 
  return { variant: "token_weighted", totals, normTotals, ranking, 
winner: ranking[0]?.optionId ?? options[0].id }; 
} 
 
function quadraticVoting( 
  options: Option[], 
  voters: Voter[], 
  ballots: Ballot[], 
  mode: "sqrt" | "quadratic", 
  creditsDefault = 9 
): VariantResult { 
  const vmap = new Map(voters.map(v => [v.id, v])); 
  const totals: Record<string, number> = 
Object.fromEntries(options.map(o => [o.id, 0])); 
  for (const b of ballots) { 
    const v = vmap.get(b.voterId) || { id: b.voterId, weight: 1, 
credits: creditsDefault }; 
    const credits = Number.isFinite(v.credits ?? creditsDefault) ? 
(v.credits ?? creditsDefault) : creditsDefault; 
    const w = safeWeight(v); 
    // normalizamos las puntuaciones del votante a presupuesto de 
créditos 
    const raw = Object.entries(b.scores).filter(([k, s]) => k in 
totals && s > 0); 
    if (!raw.length) continue; 
 
    // calculamos asignación de "votos efectivos" bajo coste 
cuadrático 
    // - mode "quadratic": coste = v^2, sum(v^2) <= credits  -> 
escalamos 
    // - mode "sqrt": votos = sqrt(credits * p_i) con p_i proporción 
    let eff: Array<[string, number]> = []; 
 
    if (mode === "quadratic") { 
      // tomar puntajes como demanda de votos; escalamos factor t para 
cumplir sum(v^2)=credits 
      const demand = raw.map(([k, s]) => [k, Math.max(0, s)] as 
[string, number]); 
      const sumS = demand.reduce((a, [, s]) => a + s, 0) || 1; 
      // proporción deseada 
      const prop = demand.map(([k, s]) => [k, s / sumS] as [string, 
number]); 
      // resolver v_i tal que sum(v_i^2)=credits y v_i ∝ prop_i -> v_i 
= sqrt(credits)*sqrt(prop_i) 
      eff = prop.map(([k, p]) => [k, Math.sqrt(credits) * 
Math.sqrt(p)]); 
    } else { 
      const sumS = raw.reduce((a, [, s]) => a + s, 0) || 1; 
      eff = raw.map(([k, s]) => [k, Math.sqrt((credits * s) / sumS)]); 
    } 
 
    for (const [k, votes] of eff) { 
      totals[k] += w * votes; 
    } 
  } 
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1; 
  const normTotals = 
Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v / 
sum])); 
  const ranking = Object.entries(totals).sort((a, b) => b[1] - 
a[1]).map(([optionId, score]) => ({ optionId, score })); 
  return { variant: "quadratic_voting", totals, normTotals, ranking, 
winner: ranking[0]?.optionId ?? options[0].id }; 
} 
 
// ---------- Métricas ---------- 
function gini(values: number[]) { 
  const n = values.length; 
  if (!n) return 0; 
  const sorted = [...values].sort((a, b) => a - b); 
  const sum = sorted.reduce((a, b) => a + b, 0); 
  if (sum === 0) return 0; 
  let cum = 0; 
  let acc = 0; 
  for (let i = 0; i < n; i++) { 
    cum += sorted[i]; 
    acc += cum; 
  } 
  return (n + 1 - (2 * acc) / sum) / n; 
} 
 
function topShare(values: number[], fraction = 0.1) { 
  if (!values.length) return 0; 
  const sorted = [...values].sort((a, b) => b - a); 
  const take = Math.max(1, Math.floor(values.length * fraction)); 
  const num = sorted.slice(0, take).reduce((a, b) => a + b, 0); 
  const den = values.reduce((a, b) => a + b, 0) || 1; 
  return num / den; 
} 
 
function metricsFor( 
  variant: Variant, 
  options: Option[], 
  voters: Voter[], 
  ballots: Ballot[], 
  result: VariantResult 
): Metrics { 
  const voterTotals = new Map<string, number>(); 
  const vmap = new Map(voters.map(v => [v.id, v])); 
  // contribución por votante (aproximada según variante) 
  for (const b of ballots) { 
    const w = safeWeight(vmap.get(b.voterId) || { id: b.voterId, 
weight: 1 }); 
    const scores = Object.entries(b.scores).filter(([k, s]) => k in 
result.totals && s > 0); 
    if (!scores.length) continue; 
    let contribution = 0; 
    if (variant === "one_person_one_vote") { 
      const max = Math.max(...scores.map(([, s]) => s)); 
      const winners = scores.filter(([, s]) => s === max); 
      contribution = 1 / winners.length; 
    } else if (variant === "token_weighted") { 
      contribution = w * scores.reduce((a, [, s]) => a + s, 0); 
    } else { 
      // aproximación: votos efectivos ~ sqrt(s) 
      const sumS = scores.reduce((a, [, s]) => a + s, 0) || 1; 
      contribution = w * scores.reduce((a, [, s]) => a + Math.sqrt(s / 
sumS), 0); 
    } 
    voterTotals.set(b.voterId, (voterTotals.get(b.voterId) || 0) + 
contribution); 
  } 
 
  const turnoutVoters = new Set(ballots.filter(b => 
Object.values(b.scores).some(x => x > 0)).map(b => b.voterId)); 
  const turnoutRate = voters.length ? turnoutVoters.size / 
voters.length : 0; 
 
  // gini por opción (promedio) 
  const giniList: number[] = []; 
  for (const op of options) { 
    const perVoter: number[] = []; 
    for (const b of ballots) { 
      const w = safeWeight(vmap.get(b.voterId) || { id: b.voterId, 
weight: 1 }); 
      const s = b.scores[op.id] || 0; 
      if (variant === "one_person_one_vote") { 
        // 1 si elige esa opción (como vencedora personal), 0 en otro 
caso 
        const entries = Object.entries(b.scores); 
        const max = Math.max(...entries.map(([, v]) => v)); 
        const winners = entries.filter(([, v]) => v === max && v > 
0).map(([k]) => k); 
        perVoter.push(winners.includes(op.id) ? 1 : 0); 
      } else if (variant === "token_weighted") { 
        perVoter.push(w * s); 
      } else { 
        perVoter.push(w * Math.sqrt(s)); 
      } 
    } 
    giniList.push(gini(perVoter)); 
  } 
 
  const top10Share = topShare(Array.from(voterTotals.values()), 0.1); 
 
  const ranking = result.ranking; 
  const totalSum = ranking.reduce((a, r) => a + r.score, 0) || 1; 
  const decisiveMargin = 
    ranking.length >= 2 ? (ranking[0].score - ranking[1].score) / 
totalSum : ranking[0]?.score || 0; 
 
  // desacuerdo: balotas con mayor masa en perdedor top-2 
  const loserId = ranking[1]?.optionId; 
  let disagreement = 0; 
  for (const b of ballots) { 
    const sc1 = b.scores[ranking[0].optionId] || 0; 
    const sc2 = loserId ? (b.scores[loserId] || 0) : 0; 
    if (sc2 > sc1) disagreement++; 
  } 
  const disagreementRate = ballots.length ? disagreement / 
ballots.length : 0; 
 
  // sensibilidad sybil (proxy): si duplicamos los 5 votantes top en 2 
cuentas, ¿cuánto sube la cuota del ganador? 
  const topVoters = Array.from(voterTotals.entries()).sort((a, b) => 
b[1] - a[1]).slice(0, Math.max(1, Math.floor(voters.length * 
0.05))).map(([id]) => id); 
  const winnerId = result.winner; 
  const originalShare = result.normTotals[winnerId] || 0; 
  // Simulación rápida: duplicamos balotas top con peso/credits 
dividido entre 2 
  const vmap2 = new Map(voters.map(v => [v.id, { ...v }])); 
  const ballots2: Ballot[] = []; 
  for (const b of ballots) { 
    if (topVoters.includes(b.voterId)) { 
      const v = vmap2.get(b.voterId); 
      if (v) { 
        const halfW = safeWeight(v) / 2; 
        const halfC = (v.credits ?? 9) / 2; 
        ballots2.push({ voterId: b.voterId + "_a", scores: b.scores 
}); 
        ballots2.push({ voterId: b.voterId + "_b", scores: b.scores 
}); 
        // reflejamos en voters array 
        vmap2.set(b.voterId + "_a", { ...v, id: b.voterId + "_a", 
weight: halfW, credits: halfC }); 
        vmap2.set(b.voterId + "_b", { ...v, id: b.voterId + "_b", 
weight: halfW, credits: halfC }); 
      } 
    } else { 
      ballots2.push(b); 
    } 
  } 
  const voters2 = Array.from(vmap2.values()); 
  let result2: VariantResult; 
  if (variant === "one_person_one_vote") result2 = 
onePersonOneVote(options, voters2, ballots2); 
  else if (variant === "token_weighted") result2 = 
tokenWeighted(options, voters2, ballots2); 
  else result2 = quadraticVoting(options, voters2, ballots2, 
"quadratic", 9); 
  const sybilSensitivity = Math.max(0, (result2.normTotals[winnerId] 
|| 0) - originalShare); 
 
  return { turnoutRate, giniByOption: giniList.reduce((a, b) => a + b, 
0) / (giniList.length || 1), top10Share, decisiveMargin, 
disagreementRate, sybilSensitivity }; 
} 
 
// Robustez por perturbación aleatoria de balotas 
function robustnessFor( 
  variant: Variant, 
  options: Option[], 
  voters: Voter[], 
  ballots: Ballot[], 
  n = 250, 
  strength = 0.1 
): Robustness { 
  const choose = <T,>(arr: T[], k: number) => { 
    const a = [...arr]; const out: T[] = []; 
    for (let i = 0; i < k && a.length; i++) 
out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]); 
    return out; 
  }; 
 
  const base = 
    variant === "one_person_one_vote" 
      ? onePersonOneVote(options, voters, ballots) 
      : variant === "token_weighted" 
      ? tokenWeighted(options, voters, ballots) 
      : quadraticVoting(options, voters, ballots, "quadratic", 9); 
 
  let stable = 0; 
  let flip = 0; 
  let delta = 0; 
 
  for (let i = 0; i < n; i++) { 
    const perturbed = ballots.map(b => ({ ...b, scores: { ...b.scores 
} })); 
    const k = Math.max(1, Math.floor(ballots.length * strength)); 
    for (const b of choose(perturbed, k)) { 
      // ruido: mover hasta 20% de su masa hacia otra opción aleatoria 
      const opts = Object.keys(b.scores).length ? 
Object.keys(b.scores) : options.map(o => o.id); 
      const target = opts[Math.floor(Math.random() * opts.length)]; 
      const total = Object.values(b.scores).reduce((a, s) => a + 
Math.max(0, s), 0) || 1; 
      const move = total * (0.1 + 0.1 * Math.random()); 
      // restamos proporcionalmente y sumamos al target 
      for (const k2 of Object.keys(b.scores)) { 
        const share = Math.max(0, b.scores[k2] || 0) / total; 
        b.scores[k2] = Math.max(0, (b.scores[k2] || 0) - move * 
share); 
      } 
      b.scores[target] = (b.scores[target] || 0) + move; 
    } 
 
    const r = 
      variant === "one_person_one_vote" 
        ? onePersonOneVote(options, voters, perturbed) 
        : variant === "token_weighted" 
        ? tokenWeighted(options, voters, perturbed) 
        : quadraticVoting(options, voters, perturbed, "quadratic", 9); 
 
    if (r.winner === base.winner) stable++; 
    else flip++; 
 
    delta += Math.abs((r.totals[base.winner] || 0) - 
(base.totals[base.winner] || 0)); 
  } 
 
  return { 
    stability: stable / n, 
    avgWinnerDelta: delta / n, 
    flipRate: flip / n, 
  }; 
} 
 
export function compareVariants(req: CompareRequest): CompareResponse 
{ 
  if (!req?.options?.length) throw new Error("options[] requerido"); 
  if (!req?.voters?.length) throw new Error("voters[] requerido"); 
  if (!req?.ballots?.length) throw new Error("ballots[] requerido"); 
 
  const variants: Variant[] = req.variants ?? ["one_person_one_vote", 
"token_weighted", "quadratic_voting"]; 
  const qvMode = req.qv_cost ?? "quadratic"; 
  const credits = req.qv_credits_default ?? 9; 
 
  const hash = crypto 
    .createHash("sha256") 
    .update(JSON.stringify({ ...req, ballots: undefined })) // evitar 
peso 
    .digest("hex"); 
 
  const out: CompareResponse = { 
    hash, 
    summary: [], 
    options: req.options, 
  }; 
 
  for (const v of variants) { 
    let res: VariantResult; 
    if (v === "one_person_one_vote") res = 
onePersonOneVote(req.options, req.voters, req.ballots); 
    else if (v === "token_weighted") res = tokenWeighted(req.options, 
req.voters, req.ballots); 
    else res = quadraticVoting(req.options, req.voters, req.ballots, 
qvMode, credits); 
 
    const m = metricsFor(v, req.options, req.voters, req.ballots, 
res); 
    const r = robustnessFor( 
      v, 
      req.options, 
      req.voters, 
      req.ballots, 
      req.perturbations ?? 250, 
      req.perturb_strength ?? 0.1 
    ); 
 
    out.summary.push({ variant: v, result: res, metrics: m, 
robustness: r }); 
  } 
 
  return out; 
} 
 
