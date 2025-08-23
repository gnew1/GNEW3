
/**
 * N326 DoD: Diferencias < X% en dataset simulado, ETL y matching por txid y por monto+fecha.
 * Usamos pg-mem para DB en tests (sin extensiones).
 */
import request from "supertest";
import app from "../src/app";
import { newDb } from "pg-mem";

// Patch pg with pg-mem and preload migration
jest.mock("pg", () => {
  const mem = newDb({ autoCreateForeignKeyIndices: true });
  const { Pool } = mem.adapters.createPg();
  const p = new Pool();
  const fs = require("fs");
  const path = require("path");
  const sql = fs.readFileSync(path.join(__dirname, "../src/db/migrations/001_init.sql"), "utf-8");
  (async () => {
    const c = await p.connect(); await c.query(sql); c.release();
  })();
  return { Pool };
});

describe("recon-service", () => {
  it("healthz", async () => {
    const r = await request(app).get("/healthz");
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it("ETL upload + reconcile (txid and amount/date)", async () => {
    // Provider CSV
    const csv = `id,amount,timestamp,currency,memo,external_ref
p1,100.00,2025-01-01T10:00:00Z,EUR,Sale A,tx-1
p2,50.00,2025-01-01T11:00:00Z,EUR,Sale B,
p3,25.00,2025-01-02T09:00:00Z,EUR,Sale C,tx-3`;
    const upP = await request(app).post("/upload/provider").send({
      provider: "stripe",
      currency: "EUR",
      format: "csv",
      data: csv,
      csv: { delimiter: ",", headers: { id: "id", amount: "amount", timestamp: "timestamp", currency: "currency", memo: "memo", external_ref: "external_ref" } }
    });
    expect(upP.status).toBe(201);

    // Ledger JSON normalized
    const upL = await request(app).post("/upload/ledger").send({
      source: "ledger",
      currency: "EUR",
      format: "json",
      data: [
        { ext_id: "L1", amount: 100.00, currency: "EUR", timestamp: "2025-01-01T10:01:00Z", external_ref: "tx-1" }, // txid match
        { ext_id: "L2", amount: 49.99, currency: "EUR", timestamp: "2025-01-01T11:30:00Z" },                       // amount/date match to p2 (1c diff)
        { ext_id: "L3", amount: 25.00, currency: "EUR", timestamp: "2025-01-02T09:05:00Z", external_ref: "tx-3" }   // txid match
      ]
    });
    expect(upL.status).toBe(201);

    const run = await request(app).post("/reconcile/run").send({
      provider: "stripe",
      currency: "EUR",
      tolerance: 0.01, // 1%
      dateWindowDays: 1
    });
    expect(run.status).toBe(200);
    expect(run.body.matched).toBe(3);
    expect(run.body.unmatched).toBe(0);
    expect(Math.abs(run.body.diffRatio)).toBeLessThan(0.01);
  });

  it("alerts when diffRatio exceeds threshold", async () => {
    // Minimal new provider upload with no matching ledger
    const upP = await request(app).post("/upload/provider").send({
      provider: "bankx",
      currency: "EUR",
      format: "json",
      data: [{ id: "b1", amount: 200, timestamp: "2025-02-01T00:00:00Z" }],
      csv: { headers: { id: "id", amount: "amount", timestamp: "timestamp" } } // not used for json normalized
    });
    expect(upP.status).toBe(201);

    const run = await request(app).post("/reconcile/run").send({
      provider: "bankx",
      currency: "EUR",
      tolerance: 0.005,
      dateWindowDays: 1
    });
    expect(run.status).toBe(200);
    expect(run.body.unmatched).toBeGreaterThan(0);
    expect(run.body.diffRatio).toBeCloseTo(1, 5);

    // fetch last
    const last = await request(app).get("/reconcile/last/bankx");
    expect(last.status).toBe(200);
    expect(Number(last.body.unmatched)).toBeGreaterThan(0);
  });
});


