
import { Pool } from "pg";
import { randomUUID } from "crypto";

type Params = { provider: string; currency: string; tolerance: number; dateWindowDays: number; tag?: string };
type Tx = { id: number; amount: number; currency: string; ts: string | Date; external_ref?: string | null };
type Match = { provider_tx_id: number; ledger_tx_id: number | null; method: "txid"|"amount_date"|"unmatched"; score: number; status: "matched"|"unmatched" };

export async function runReconciliation(pool: Pool, p: Params) {
  const client = await pool.connect();
  const runId = randomUUID();
  function toMs(t: string | Date): number {
    return t instanceof Date ? t.getTime() : new Date(t).getTime();
  }
  function pickExternalRef(row: Record<string, unknown>): string | null | undefined {
    const v = row["external_ref"];
    return typeof v === "string" ? v : (v as null | undefined);
  }
  try {
    await client.query("begin");
    await client.query(
      `insert into recon_runs(id, provider, currency, params) values($1,$2,$3,$4)`,
      [runId, p.provider, p.currency, p]
    );

    // Fetch window bounds based on provider data
    const w = await client.query(
      `select min(ts) as min_ts, max(ts) as max_ts from provider_tx where provider=$1 and currency=$2`,
      [p.provider, p.currency]
    );
    if (!w.rowCount || !w.rows[0].min_ts) {
      await client.query("commit");
      return { runId, matched: 0, unmatched: 0, providerTotal: 0, matchedTotal: 0, diffRatio: 0 };
    }
    const min = new Date(w.rows[0].min_ts);
    const max = new Date(w.rows[0].max_ts);
    const from = new Date(min.getTime() - p.dateWindowDays * 86400 * 1000);
    const to = new Date(max.getTime() + p.dateWindowDays * 86400 * 1000);

    const prov = await client.query<Tx>(
      `select id, amount, currency, ts, external_ref from provider_tx
       where provider=$1 and currency=$2 and ts between $3 and $4 order by ts asc`,
      [p.provider, p.currency, from.toISOString(), to.toISOString()]
    );
    const ledg = await client.query<Tx>(
      `select id, amount, currency, ts, external_ref from ledger_tx
       where currency=$1 and ts between $2 and $3 order by ts asc`,
      [p.currency, from.toISOString(), to.toISOString()]
    );

    // Coerce numeric strings to numbers for computations
    const provRows: Tx[] = prov.rows.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      amount: Number(r.amount as string | number),
      currency: r.currency as string,
      ts: r.ts as string | Date,
      external_ref: pickExternalRef(r),
    }));
    const ledgRows: Tx[] = ledg.rows.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      amount: Number(r.amount as string | number),
      currency: r.currency as string,
      ts: r.ts as string | Date,
      external_ref: pickExternalRef(r),
    }));

    const ledgerByTxid = new Map<string, Tx>();
    const ledgerUnused = new Set<number>();
  for (const l of ledgRows) {
      if (l.external_ref) ledgerByTxid.set(l.external_ref, l);
      ledgerUnused.add(l.id);
    }

    const matches: Match[] = [];
    let providerTotal = 0;
    let matchedTotal = 0;

    // Pass 1: txid exact
  for (const r of provRows) {
      providerTotal += r.amount;
      let matched = false;
      if (r.external_ref && ledgerByTxid.has(r.external_ref)) {
        const l = ledgerByTxid.get(r.external_ref)!;
        matches.push({ provider_tx_id: r.id, ledger_tx_id: l.id, method: "txid", score: 1, status: "matched" });
        matchedTotal += l.amount;
        ledgerUnused.delete(l.id);
        ledgerByTxid.delete(r.external_ref);
        matched = true;
      }
      if (!matched) {
        matches.push({ provider_tx_id: r.id, ledger_tx_id: null, method: "unmatched", score: 0, status: "unmatched" });
      }
    }

    // Build quick index for amount/date matches among unused ledger tx
  const ledgerRest = ledgRows.filter((x: Tx) => ledgerUnused.has(x.id));
    const provUnmatchedIdx = new Map<number, number>(); // index in matches array
    matches.forEach((m, i) => { if (m.status === "unmatched") provUnmatchedIdx.set(m.provider_tx_id, i); });

  const tolerance = p.tolerance;
  const windowMs = p.dateWindowDays * 86400 * 1000;

    for (const l of ledgerRest) {
      // Find closest provider unmatched by abs(amount diff) then date diff
      let best: { idx: number; score: number } | null = null;
      for (const [provId, i] of provUnmatchedIdx.entries()) {
  const pr = provRows.find((r: Tx) => r.id === provId)!;
        if (pr.currency !== l.currency) continue;
        const amtDiff = Math.abs(pr.amount - l.amount);
        const rel = Math.abs(amtDiff) / Math.max(Math.abs(pr.amount), 1);
        if (rel <= tolerance) {
          const dateDiff = Math.abs(toMs(pr.ts) - toMs(l.ts));
          if (dateDiff <= windowMs) {
            const score = 1 - (rel + dateDiff / (windowMs + 1)) / 2;
            if (!best || score > best.score) best = { idx: i, score };
          }
        }
      }
      if (best) {
        const i = best.idx;
        matches[i] = { ...matches[i], ledger_tx_id: l.id, method: "amount_date", score: best.score, status: "matched" };
        matchedTotal += l.amount;
        provUnmatchedIdx.delete(matches[i].provider_tx_id);
      }
    }

    // Persist matches
    for (const m of matches) {
      await client.query(
        `insert into recon_matches(run_id, provider_tx_id, ledger_tx_id, method, score, status)
         values($1,$2,$3,$4,$5,$6)`,
        [runId, m.provider_tx_id, m.ledger_tx_id, m.method, m.score, m.status]
      );
    }

    const diffRatio = providerTotal === 0 ? 0 : (providerTotal - matchedTotal) / providerTotal;

    await client.query(
      `update recon_runs set summary=$2 where id=$1`,
      [runId, { providerTotal, matchedTotal, diffRatio, counts: { matched: matches.filter(m => m.status === "matched").length, unmatched: matches.filter(m => m.status === "unmatched").length } }]
    );

    await client.query("commit");
    return {
      runId,
      matched: matches.filter(m => m.status === "matched").length,
      unmatched: matches.filter(m => m.status === "unmatched").length,
      providerTotal,
      matchedTotal,
      diffRatio
    };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}


