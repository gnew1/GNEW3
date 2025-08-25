/*
 End-to-end smoke for recon-service using in-memory DB. Prints JSON outputs.
*/

process.env.PG_MEM = process.env.PG_MEM || "1";
process.env.DISABLE_AUTH = process.env.DISABLE_AUTH || "1";
process.env.PORT = process.env.PORT || "8110"; // harmless even when using supertest

import request from "supertest";

async function main() {
  // Dynamically import after env set
  const { default: app } = await import("../src/app.js");

  const base = request(app);

  const out: {
    health?: unknown;
    migrate?: unknown;
    providerUpload?: { ok: boolean; inserted: number; statementId: number };
    ledgerUpload?: { ok: boolean; inserted: number; importId: number };
    run?: { runId: string; matched: number; unmatched: number; providerTotal: number; matchedTotal: number; diffRatio: number };
  runStatus?: number;
  runs?: Array<{ id: string; provider: string; currency: string; created_at: string; summary: unknown }>;
    runById?: unknown;
  } = {};

  // Health
  out.health = await base.get("/healthz").expect(200).then(r => r.body);

  // Migrate
  out.migrate = await base.post("/admin/migrate").send({}).expect(200).then(r => r.body);

  // Provider upload (CSV)
  const csv = [
    "id,amount,timestamp,currency,memo,external_ref",
    "p1,100.00,2025-01-01T10:00:00Z,EUR,Sale A,tx-1",
    "p2,50.00,2025-01-01T11:00:00Z,EUR,Sale B,",
    "p3,25.00,2025-01-02T09:00:00Z,EUR,Sale C,tx-3",
  ].join("\n");
  const payloadProv = {
    provider: "stripe",
    currency: "EUR",
    format: "csv",
    data: csv,
    csv: {
      delimiter: ",",
      headers: { id: "id", amount: "amount", timestamp: "timestamp", currency: "currency", memo: "memo", external_ref: "external_ref" }
    }
  } as const;
  out.providerUpload = await base
    .post("/provider/upload")
    .set("content-type", "application/json")
    .send(payloadProv)
    .expect(201)
    .then(r => r.body);

  // Ledger upload (JSON)
  const dataLedger = [
    { ext_id: "L1", amount: 100.00, currency: "EUR", timestamp: "2025-01-01T10:01:00Z", external_ref: "tx-1" },
    { ext_id: "L2", amount: 49.99, currency: "EUR", timestamp: "2025-01-01T11:30:00Z" },
    { ext_id: "L3", amount: 25.00, currency: "EUR", timestamp: "2025-01-02T09:05:00Z", external_ref: "tx-3" },
  ];
  const payloadLedger = { source: "ledger", currency: "EUR", format: "json", data: dataLedger } as const;
  out.ledgerUpload = await base
    .post("/ledger/upload")
    .set("content-type", "application/json")
    .send(payloadLedger)
    .expect(201)
    .then(r => r.body);

  // Run reconcile
  const payloadRun = { provider: "stripe", currency: "EUR", tolerance: 0.01, dateWindowDays: 1 } as const;
  const runResp = await base
    .post("/reconcile/run")
    .set("content-type", "application/json")
    .send(payloadRun);
  out.runStatus = runResp.status;
  out.run = runResp.body;

  // List runs + fetch by id
  out.runs = await base.get("/reconcile/runs").expect(200).then(r => r.body);
  const runId = ((): string | undefined => {
    const r = out.run as unknown;
    if (r && typeof r === 'object' && 'runId' in r) {
      const v = (r as Record<string, unknown>).runId;
      return typeof v === 'string' ? v : undefined;
    }
    return undefined;
  })();
  if (runId) {
    out.runById = await base.get(`/reconcile/runs/${runId}`).expect(200).then(r => r.body);
  }

  // Print final
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
