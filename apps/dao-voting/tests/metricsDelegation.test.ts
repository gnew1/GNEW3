
import request from "supertest";
import { startMetricsService, delegations } from "../src/metricsDelegation";

let server: any;

beforeAll((done) => {
  server = startMetricsService(5070);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("Delegation Metrics Service", () => {
  it("returns empty metrics when no delegations", async () => {
    delegations.length = 0;
    const res = await request("http://localhost:5070").get(
      "/metrics/delegations"
    );
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it("computes metrics correctly", async () => {
    delegations.length = 0;
    delegations.push(
      { delegator: "u1", delegate: "u2", proposalId: "p1", timestamp: Date.now() },
      { delegator: "u3", delegate: "u2", proposalId: "p1", timestamp: Date.now() },
      { delegator: "u4", delegate: "u5", proposalId: "p2", timestamp: Date.now() }
    );

    const res = await request("http://localhost:5070").get(
      "/metrics/delegations"
    );
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.byProposal.p1).toBe(2);
    expect(res.body.topDelegates[0][0]).toBe("u2");
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "dev:metrics": "ts-node src/metricsDelegation.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N347.

