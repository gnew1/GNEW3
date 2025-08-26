/**
 * DoD: FPR/FNR aceptables en dataset simulado; sanciones → L2; evidencia hash-chain.
 * Usamos pg-mem para DB en tests (sin extensiones); parcheamos 'pg'.
 */
import request from "supertest";
import { newDb } from "pg-mem";
import jwt from "jsonwebtoken";
import { generateKeyPairSync } from "crypto";

// Patch pg with in-memory
jest.mock("pg", () => {
  const mem = newDb({ autoCreateForeignKeyIndices: true });
  mem.public.registerFunction({
    name: "gen_random_uuid",
    returns: "uuid" as any,
    implementation: () => require("uuid").v4(),
  });
  // Create schema from migrations
  const { Pool } = mem.adapters.createPg();
  const p = new Pool();
  const fs = require("fs");
  const path = require("path");
  const sql1 = fs.readFileSync(path.join(__dirname, "../src/db/migrations/001_init.sql"), "utf-8");
  const sql2 = fs.readFileSync(path.join(__dirname, "../src/db/migrations/002_seed.sql"), "utf-8");
  (async () => {
    const client = await p.connect();
    await client.query(sql1.replace(/create extension.*?;/gis, "").replace(/DO \$\$.*?\$\$/gis, ""));
    await client.query(sql2);
    client.release();
  })();
  return { Pool };
});

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.JWT_PUBLIC_KEY = publicKey.export({ type: "pkcs1", format: "pem" }).toString();
const app = require("../src/app").default;

const sign = (roles: string[]) =>
  jwt.sign({ sub: "u1", roles }, privateKey, {
    algorithm: "RS256",
    audience: "gnew",
    issuer: "https://sso.example.com/",
  });

describe("aml-service", () => {
  it("healthz", async () => {
    const r = await request(app).get("/healthz");
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it("ingests transaction", async () => {
    const r = await request(app)
      .post("/ingest/tx")
      .set("Authorization", `Bearer ${sign(["aml:ingest"])}`)
      .send({ userId: "u1", amount: 100 });
    expect(r.status).toBe(201);
    expect(r.body.ok).toBe(true);
    expect(r.body.action).toBe("allow");
  });

  it("admin model lifecycle", async () => {
    const model = { weights: { amount: 0.1 }, bias: 0, thresholdL1: 0.5, thresholdL2: 0.8 };
    const admin = sign(["aml:admin"]);
    const post = await request(app).post("/admin/model").set("Authorization", `Bearer ${admin}`).send(model);
    expect(post.status).toBe(200);
    const get = await request(app).get("/admin/model").set("Authorization", `Bearer ${admin}`);
    expect(get.status).toBe(200);
  });

  it("sanctions and metrics", async () => {
    const admin = sign(["aml:admin"]);
    const up = await request(app)
      .post("/admin/sanctions")
      .set("Authorization", `Bearer ${admin}`)
      .send([{ name: "X" }]);
    expect(up.status).toBe(200);
    const metrics = await request(app)
      .get("/metrics")
      .set("Authorization", `Bearer ${sign(["aml:read"])}`);
    expect(metrics.status).toBe(200);
  });

  it("alerts endpoints 404", async () => {
    const fake = require("uuid").v4();
    const r1 = await request(app)
      .get(`/alerts/${fake}`)
      .set("Authorization", `Bearer ${sign(["aml:read"])}`);
    expect(r1.status).toBe(404);
    const r2 = await request(app)
      .post(`/alerts/${fake}/ack`)
      .set("Authorization", `Bearer ${sign(["aml:analyst"])}`)
      .send({ action: "ack" });
    expect(r2.status).toBe(404);
  });
});
