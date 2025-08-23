
import request from "supertest";
import app from "../src/app";
import jwt from "jsonwebtoken";

const PRIV = `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQCqQ9vC0v/8Hk6kqJvP3kz7qvA1oXc4oYwz2m8QpU7q6rjJb8jJ
9c1X7o2mFzQb4L9o2jvQ6j9bJvJqQv1mR9YH7yJ6zC8qj3PqvF3e6Q5yN2o3k4qL
b8m7o2nFz6q7u8p1w2x3y4z5A6B7C8D9E0F1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5
IDAQABAoGBAI+e2wB9j5J7tYc8sYJg1dp1vQm1lP7H2b9QmYz2x3c4v5b6n7m8p9
q0r1s2t3u4v5w6x7y8z9A0B1C2D3E4F5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1
W2X3Y4Z5a6b7c8d9e0f1g2h3
-----END RSA PRIVATE KEY-----`;

const PUB = `-----BEGIN PUBLIC KEY-----
MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKpD28LS//weTqSom8/eTPuq8DWhdzih
jDPabxClTurquMlvymn1zVfujacXOrq7inXDbHf3Q7kN8m7iBq0eK1sCAwEAAQ==
-----END PUBLIC KEY-----`;

beforeAll(() => {
  process.env.JWT_PUBLIC_KEY = PUB;
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


