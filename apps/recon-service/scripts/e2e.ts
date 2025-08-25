/*
 End-to-end sanity test for recon-service using in-memory DB (pg-mem).
 It spins up the Express app in-process and calls endpoints via supertest,
 avoiding shell issues. Prints JSON outputs to stdout.
*/

import request from "supertest";
import createApp from "../src/app";

async function run() {
  process.env.PG_MEM = process.env.PG_MEM ?? "1";
  process.env.DISABLE_AUTH = "1";

  const { app, pool } = await createApp();

  // Ensure migrations
  const { ensureMigrations } = await import("../src/db/migrate");
  await ensureMigrations(pool);

  // Health
  const health = await request(app).get("/healthz");
  console.log("/healthz ->", health.status, JSON.stringify(health.body));

  // Provider CSV upload
  const csv = [
    "id,amount,timestamp,currency,memo,external_ref",
    "p1,100.00,2025-01-01T10:00:00Z,EUR,Sale A,tx-1",
    "p2,50.00,2025-01-01T11:00:00Z,EUR,Sale B,",
    "p3,25.00,2025-01-02T09:00:00Z,EUR,Sale C,tx-3",
  ].join("\n");
  const payloadProv = {
    provider: "stripe",
    currency: "EUR",
    format: "csv" as const,
    data: csv,
    csv: {
      delimiter: ",",
      headers: { id: "id", amount: "amount", timestamp: "timestamp", currency: "currency", memo: "memo", external_ref: "external_ref" },
    },
  };
  const prov = await request(app).post("/provider/upload").send(payloadProv).set("content-type", "application/json");
  console.log("/provider/upload ->", prov.status, JSON.stringify(prov.body));

  // Ledger JSON upload
  const payloadLedger = {
    source: "ledger",
    currency: "EUR",
    format: "json" as const,
    data: [
      { ext_id: "L1", amount: 100.0, currency: "EUR", timestamp: "2025-01-01T10:01:00Z", external_ref: "tx-1" },
      { ext_id: "L2", amount: 49.99, currency: "EUR", timestamp: "2025-01-01T11:30:00Z" },
      { ext_id: "L3", amount: 25.0, currency: "EUR", timestamp: "2025-01-02T09:05:00Z", external_ref: "tx-3" },
    ],
  };
  const led = await request(app).post("/ledger/upload").send(payloadLedger).set("content-type", "application/json");
  console.log("/ledger/upload ->", led.status, JSON.stringify(led.body));

  // Run reconcile
  const payloadRun = { provider: "stripe", currency: "EUR", tolerance: 0.01, dateWindowDays: 1 };
  const run = await request(app).post("/reconcile/run").send(payloadRun).set("content-type", "application/json");
  console.log("/reconcile/run ->", run.status, JSON.stringify(run.body));

  // List runs
  const runs = await request(app).get("/reconcile/runs");
  console.log("/reconcile/runs ->", runs.status, JSON.stringify(runs.body));

  // Get run
  const runId = run.body?.runId ?? runs.body?.[0]?.id;
  if (runId) {
    const one = await request(app).get(`/reconcile/runs/${runId}`);
    console.log(`/reconcile/runs/${runId} ->`, one.status, JSON.stringify(one.body));
  }
}

run().catch((e) => {
  console.error("e2e_failed", e);
  process.exit(1);
});
