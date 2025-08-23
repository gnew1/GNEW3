
import { db } from "./db.js";
import { cfg } from "./config.js";

export type Evidence = {
  type: string;
  weight: number;
  details: any;
};

export function detectForProposal(proposalId: string) {
  // obtener votos de la propuesta
  const votes = db.prepare("SELECT * FROM votes WHERE proposalId=? ORDER BY ts ASC").all(proposalId) as any[];
  const alerts: any[] = [];
  for (const v of votes) {
    const r = scoreVoter(v.voter, v.ts);
    if (r.score >= cfg.alertThreshold) {
      alerts.push({
        proposalId, voter: v.voter, score: r.score,
        reason: JSON.stringify(r.evidences),
        ts: v.ts
      });
    }
  }
  if (alerts.length) {
    const ins = db.prepare("INSERT OR REPLACE INTO alerts(id, proposalId, voter, score, reason, ts) VALUES(?,?,?,?,?,?)");
    for (const a of alerts) ins.run(`${proposalId}:${a.voter}`, a.proposalId, a.voter, a.score, a.reason, a.ts);
  }
  return { total: votes.length, flagged: alerts.length };
}

export function scoreVoter(voter: string, voteTs: number) {
  const preWindowStart = voteTs - cfg.preMin * 60;
  const postWindowEnd  = voteTs + cfg.postMin * 60;

  // 1) Funding antes del voto (entradas)
  const incoming = db.prepare("SELECT * FROM transfers WHERE toAddr=? AND ts>=? AND ts<? ORDER BY ts ASC")
    .all(voter, preWindowStart, voteTs) as any[];
  // 2) Return flow después (salidas)
  const outgoing = db.prepare("SELECT * FROM transfers WHERE fromAddr=? AND ts>? AND ts<=? ORDER BY ts ASC")
    .all(voter, voteTs, postWindowEnd) as any[];

  const evidences: Evidence[] = [];
  // Agrupar por contrapartes
  const inBySrc = groupBy(incoming, (t) => t.fromAddr);
  const outByDst = groupBy(outgoing, (t) => t.toAddr);

  // hubs que financian a varios dentro de ventana (fan-out)
  const fanOutCounts = Object.entries(
    Object.fromEntries(
      db.prepare("SELECT fromAddr, COUNT(DISTINCT toAddr) AS c FROM transfers WHERE ts>=? AND ts<=? GROUP BY fromAddr")
        .all(preWindowStart, postWindowEnd)
        .map((r: any) => [r.fromAddr, r.c])
    )
  ).reduce((acc: Record<string, number>, [k, v]: any) => (acc[k] = v, acc), {});

  // heurística funding pre
  const topFunders = Object.keys(inBySrc);
  if (topFunders.length) {
    const sumIn = sum(incoming, (t) => Number(t.value) || 0);
    evidences.push({ type: "funding_pre", weight: cfg.weights.fundingPre, details: { count: incoming.length, uniqueFunders: topFunders.length, sumIn } });
  }

  // return-flow hacia algún financiador
  let hasReturn = false;
  for (const src of Object.keys(inBySrc)) {
    const outs = outByDst[src] ?? [];
    if (outs.length) {
      const sumBack = sum(outs, (t) => Number(t.value) || 0);
      evidences.push({ type: "return_flow", weight: cfg.weights.returnFlow, details: { to: src, count: outs.length, sumBack } });
      hasReturn = true;
    }
  }
  if (!hasReturn && outgoing.length) {
    // retorno hacia "hub" distinto también suma levemente
    evidences.push({ type: "return_flow_any", weight: cfg.weights.returnFlow * 0.5, details: { count: outgoing.length } });
  }

  // fan-out hubs: financiadores que pagaron a muchos votantes
  for (const src of Object.keys(inBySrc)) {
    const k = fanOutCounts[src] ?? 0;
    if (k >= 3) evidences.push({ type: "fan_out_hub", weight: cfg.weights.fanOut, details: { hub: src, fanOut: k } });
  }

  // fresh wallet (poca edad)
  const ent = db.prepare("SELECT createdTs FROM entities WHERE address=?").get(voter) as any;
  if (ent?.createdTs && (voteTs - ent.createdTs) < 24 * 3600) {
    evidences.push({ type: "fresh_wallet", weight: cfg.weights.fresh, details: { ageSec: (voteTs - ent.createdTs) } });
  }

  // gas payer (sponsor): si existe transferencia entrante a votante en ±2min del voto desde quien paga gas (aprox)
  const nearTransfers = db.prepare("SELECT * FROM transfers WHERE toAddr=? AND ts BETWEEN ? AND ?")
    .all(voter, voteTs - 120, voteTs + 120) as any[];
  if (nearTransfers.length >= 1) {
    evidences.push({ type: "gas_payer_pattern", weight: cfg.weights.gasPayer, details: { count: nearTransfers.length } });
  }

  // escrow‑like (contratos marcados) — simplificado: to/from con etiquetas en tabla entities.isContract=1
  const escrowHits = incoming.filter(t => isContract(t.fromAddr)).length + outgoing.filter(t => isContract(t.toAddr)).length;
  if (escrowHits > 0) evidences.push({ type: "escrow_like", weight: cfg.weights.escrow, details: { hits: escrowHits } });

  // score agregado (clamp 0..1)
  const score = clamp(evidences.reduce((s, e) => s + e.weight, 0), 0, 1);
  return { score, evidences };
}

function isContract(addr: string): boolean {
  const r = db.prepare("SELECT isContract FROM entities WHERE address=?").get(addr) as any;
  return !!r?.isContract;
}

function groupBy<T>(arr: T[], key: (t: T) => string) {
  const m: Record<string, T[]> = {};
  for (const it of arr) {
    const k = key(it);
    (m[k] ||= []).push(it);
  }
  return m;
}
function sum<T>(arr: T[], f: (t: T) => number) { return arr.reduce((a, b) => a + f(b), 0); }
function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }


