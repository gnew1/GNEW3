
/**
 * N326 DoD: Diferencias < X% en dataset simulado, ETL y matching por txid y por monto+fecha.
 * Usamos pg-mem para DB en tests (sin extensiones).
 */
import request from "supertest";
import { newDb } from "pg-mem";
import fs from "fs";
import path from "path";

let app: any;
beforeAll(async () => {
  process.env.DATABASE_URL = "pgmem";
  const createApp = (await import("../src/app")).default;
  app = (await createApp()).app;
});

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
    const csv = fs.readFileSync(path.join(__dirname, "fixtures/provider.csv"), "utf-8");
    const upP = await request(app).post("/provider/upload").send({
      provider: "stripe",
      currency: "EUR",
      format: "csv",
      data: csv,
      csv: { delimiter: ",", headers: { id: "id", amount: "amount", timestamp: "timestamp", currency: "currency", memo: "memo", external_ref: "external_ref" } }
    });
    expect(upP.status).toBe(201);

    // Ledger JSON normalized
    const ledger = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/ledger.json"), "utf-8"));
    const upL = await request(app).post("/ledger/upload").send({
      source: "ledger",
      currency: "EUR",
      format: "json",
      data: ledger
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
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/provider_alert.json"), "utf-8"));
    const upP = await request(app).post("/provider/upload").send({
      provider: "bankx",
      currency: "EUR",
      format: "json",
      data
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

    const fetched = await request(app).get(`/reconcile/runs/${run.body.runId}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.summary.counts.unmatched).toBeGreaterThan(0);
  });
});


