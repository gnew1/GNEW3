
import request from "supertest";
import jwt from "jsonwebtoken";
import { generateKeyPairSync } from "crypto";
import type { Express } from "express";

const { privateKey: PRIV, publicKey: PUB } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
});

let app: Express;
beforeAll(async () => {
  process.env.JWT_PUBLIC_KEY = PUB;
  app = (await import("../src/app")).default;
});

function sign(payload: any) {
  return jwt.sign(payload, PRIV, {
    algorithm: "RS256",
    audience: process.env.JWT_AUDIENCE ?? "gnew",
    issuer: process.env.JWT_ISSUER ?? "https://sso.example.com/",
    expiresIn: "10m",
  });
}

describe("pricing-service app", () => {
  const admin = sign({ sub: "admin", roles: ["pricing:admin"], email: "admin@gnew.io" });

  it("healthz", async () => {
    const r = await request(app).get("/healthz");
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it("returns price with 5% welcome discount for segment new", async () => {
    const r = await request(app)
      .post("/price/quote")
      .send({ sku: "SKU-1", basePrice: 100, currency: "EUR", user: { id: "u1", segment: "new", riskScore: 0.1 } });
    expect(r.status).toBe(200);
    expect(r.body.finalPrice).toBeCloseTo(95, 2);
    expect(r.body.appliedRules.length).toBeGreaterThan(0);
    expect(r.body.latencyMs).toBeLessThan(50);
  });

  it("admin CRUD draft and validate collisions", async () => {
    const draft = await request(app)
      .post("/admin/rulesets")
      .set("Authorization", `Bearer ${admin}`)
      .send({
        name: "promo-10",
        rules: [
          {
            id: "rA",
            name: "10%",
            status: "active",
            priority: 10,
            scope: { skus: ["SKU-1"] },
            effect: { type: "discount", discount: { type: "percent", value: 10 } },
          },
          {
            id: "rB",
            name: "Fixed 5",
            status: "active",
            priority: 20,
            scope: { skus: ["SKU-1"] },
            effect: { type: "discount", discount: { type: "fixed", value: 5 } },
          },
        ],
      });
    expect(draft.status).toBe(201);
    const id = draft.body.id as string;

    const val = await request(app)
      .post(`/admin/rulesets/${id}/validate`)
      .set("Authorization", `Bearer ${admin}`);
    expect(val.status).toBe(200);
    expect(val.body.collisions.length).toBeGreaterThan(0);
  });

  it("publish draft and set canary", async () => {
    const created = await request(app)
      .post("/admin/rulesets")
      .set("Authorization", `Bearer ${admin}`)
      .send({
        name: "promo-15",
        rules: [
          {
            id: "r15",
            name: "15%",
            status: "active",
            priority: 5,
            scope: { segments: ["premium"] },
            effect: { type: "discount", discount: { type: "percent", value: 15 } },
          },
        ],
      });
    const id = created.body.id as string;

    const pub = await request(app)
      .post(`/admin/rulesets/${id}/publish`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ label: "canary-promo-15" });
    expect(pub.status).toBe(200);
    expect(pub.body.status).toBe("published");

    const can = await request(app)
      .post("/admin/canary")
      .set("Authorization", `Bearer ${admin}`)
      .send({ premium: { versionId: id, percentage: 50 } });
    expect(can.status).toBe(200);
    expect(can.body.after.premium.versionId).toBe(id);
  });
});


