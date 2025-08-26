import { Pool, PoolClient } from "pg";
import { randomUUID } from "crypto";

export type Params = { provider: string; currency: string; tolerance: number; dateWindowDays: number; tag?: string };
type Tx = { id: number; amount: number; currency: string; ts: string | Date; external_ref?: string | null };
type Match = { provider_tx_id: number; ledger_tx_id: number | null; method: "txid" | "amount_date" | "unmatched"; score: number; status: "matched" | "unmatched" };
type Summary = {
  providerTotal: number;
  matchedTotal: number;
  diffRatio: number;
  counts: { matched: number; unmatched: number };
};

export async function runReconciliation(pool: Pool, p: Params) {
  const client = await pool.connect();
  const runId = randomUUID();
  try {
    await client.query("begin");
    await client.query(`insert into recon_runs(id, provider, currency, params) values($1,$2,$3,$4)`, [runId, p.provider, p.currency, p]);

    const { provRows, ledgRows } = await parseStage(client, p);
    if (!provRows.length) {
      await client.query("commit");
      return { runId, matched: 0, unmatched: 0, providerTotal: 0, matchedTotal: 0, diffRatio: 0 };
    }
    const grouped = groupStage(ledgRows);
    const { matches, providerTotal, matchedTotal } = matchStage(p, provRows, grouped);
    const summary = diffStage(matches, providerTotal, matchedTotal);
    await emitStage(client, runId, matches, summary);
    await client.query("commit");
    return {
      runId,
      matched: summary.counts.matched,
      unmatched: summary.counts.unmatched,
      providerTotal: summary.providerTotal,
      matchedTotal: summary.matchedTotal,
      diffRatio: summary.diffRatio,
    };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

function pickExternalRef(row: Record<string, unknown>): string | null | undefined {
  const v = row["external_ref"];
  return typeof v === "string" ? v : (v as null | undefined);
}

async function parseStage(client: PoolClient, p: Params): Promise<{ provRows: Tx[]; ledgRows: Tx[] }> {
  const w = await client.query(`select min(ts) as min_ts, max(ts) as max_ts from provider_tx where provider=$1 and currency=$2`, [p.provider, p.currency]);
  if (!w.rowCount || !w.rows[0].min_ts) return { provRows: [], ledgRows: [] };
  const min = new Date(w.rows[0].min_ts as string);
  const max = new Date(w.rows[0].max_ts as string);
  const from = new Date(min.getTime() - p.dateWindowDays * 86400 * 1000);
  const to = new Date(max.getTime() + p.dateWindowDays * 86400 * 1000);
  const prov = await client.query<Tx>(
    `select id, amount, currency, ts, external_ref from provider_tx where provider=$1 and currency=$2 and ts between $3 and $4 order by ts asc`,
    [p.provider, p.currency, from.toISOString(), to.toISOString()]
  );
  const ledg = await client.query<Tx>(
    `select id, amount, currency, ts, external_ref from ledger_tx where currency=$1 and ts between $2 and $3 order by ts asc`,
    [p.currency, from.toISOString(), to.toISOString()]
  );
  const map = (r: Record<string, unknown>): Tx => ({
    id: r.id as number,
    amount: Number(r.amount as string | number),
    currency: r.currency as string,
    ts: r.ts as string | Date,
    external_ref: pickExternalRef(r),
  });
  return { provRows: prov.rows.map(map), ledgRows: ledg.rows.map(map) };
}

function groupStage(ledgRows: Tx[]) {
  const ledgerByTxid = new Map<string, Tx>();
  const ledgerUnused = new Set<number>();
  for (const l of ledgRows) {
    if (l.external_ref) ledgerByTxid.set(l.external_ref, l);
    ledgerUnused.add(l.id);
  }
  return { ledgerByTxid, ledgerUnused, ledgerRows: ledgRows };
}

function matchStage(p: Params, provRows: Tx[], grouped: ReturnType<typeof groupStage>) {
  const { ledgerByTxid, ledgerUnused, ledgerRows } = grouped;
  const matches: Match[] = [];
  let providerTotal = 0;
  let matchedTotal = 0;
  for (const r of provRows) {
    providerTotal += r.amount;
    if (r.external_ref && ledgerByTxid.has(r.external_ref)) {
      const l = ledgerByTxid.get(r.external_ref)!;
      matches.push({ provider_tx_id: r.id, ledger_tx_id: l.id, method: "txid", score: 1, status: "matched" });
      matchedTotal += l.amount;
      ledgerUnused.delete(l.id);
      ledgerByTxid.delete(r.external_ref);
    } else {
      matches.push({ provider_tx_id: r.id, ledger_tx_id: null, method: "unmatched", score: 0, status: "unmatched" });
    }
  }
  const ledgerRest = ledgerRows.filter((x) => ledgerUnused.has(x.id));
  const provUnmatchedIdx = new Map<number, number>();
  matches.forEach((m, i) => {
    if (m.status === "unmatched") provUnmatchedIdx.set(m.provider_tx_id, i);
  });
  const tolerance = p.tolerance;
  const windowMs = p.dateWindowDays * 86400 * 1000;
  const toMs = (t: string | Date) => (t instanceof Date ? t.getTime() : new Date(t).getTime());
  for (const l of ledgerRest) {
    let best: { idx: number; score: number } | null = null;
    for (const [provId, idx] of provUnmatchedIdx.entries()) {
      const pr = provRows.find((r) => r.id === provId)!;
      if (pr.currency !== l.currency) continue;
      const amtDiff = Math.abs(pr.amount - l.amount);
      const rel = Math.abs(amtDiff) / Math.max(Math.abs(pr.amount), 1);
      if (rel > tolerance) continue;
      const dateDiff = Math.abs(toMs(pr.ts) - toMs(l.ts));
      if (dateDiff > windowMs) continue;
      const score = 1 - (rel + dateDiff / (windowMs + 1)) / 2;
      if (!best || score > best.score) best = { idx, score };
    }
    if (best) {
      const i = best.idx;
      matches[i] = { ...matches[i], ledger_tx_id: l.id, method: "amount_date", score: best.score, status: "matched" };
      matchedTotal += l.amount;
      provUnmatchedIdx.delete(matches[i].provider_tx_id);
    }
  }
  return { matches, providerTotal, matchedTotal };
}

function diffStage(matches: Match[], providerTotal: number, matchedTotal: number): Summary {
  const matched = matches.filter((m) => m.status === "matched").length;
  const unmatched = matches.length - matched;
  const diffRatio = providerTotal === 0 ? 0 : (providerTotal - matchedTotal) / providerTotal;
  return { providerTotal, matchedTotal, diffRatio, counts: { matched, unmatched } };
}

async function emitStage(client: PoolClient, runId: string, matches: Match[], summary: Summary) {
  for (const m of matches) {
    await client.query(
      `insert into recon_matches(run_id, provider_tx_id, ledger_tx_id, method, score, status) values($1,$2,$3,$4,$5,$6)`,
      [runId, m.provider_tx_id, m.ledger_tx_id, m.method, m.score, m.status]
    );
  }
  await client.query(`update recon_runs set summary=$2 where id=$1`, [runId, summary]);
}

export default runReconciliation;
