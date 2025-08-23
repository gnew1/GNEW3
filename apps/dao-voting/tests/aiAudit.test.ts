
import request from "supertest";
import { startAIAudit } from "../src/aiAudit";

let server: any;

beforeAll((done) => {
  server = startAIAudit(5040);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("AI Governance Audit", () => {
  it("rejects missing fields", async () => {
    const res = await request("http://localhost:5040").post("/audit/proposal").send({});
    expect(res.status).toBe(400);
  });

  it("returns audit report", async () => {
    const res = await request("http://localhost:5040")
      .post("/audit/proposal")
      .send({ proposalId: "p1", content: "This proposal benefits only elites" });

    expect(res.status).toBe(200);
    expect(res.body.auditReport.risks.length).toBeGreaterThan(0);
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "dev:ai-audit": "ts-node src/aiAudit.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N344.

