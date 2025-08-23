
import request from "supertest";
import { startRevocationService, delegations } from "../src/delegationRevocation";

let server: any;

beforeAll((done) => {
  server = startRevocationService(5071);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("Delegation Revocation Service", () => {
  it("returns 400 if required fields missing", async () => {
    const res = await request("http://localhost:5071").post("/delegations/revoke").send({});
    expect(res.status).toBe(400);
  });

  it("revokes existing delegation", async () => {
    delegations.length = 0;
    delegations.push({
      delegator: "user1",
      delegate: "user2",
      proposalId: "p1",
      timestamp: Date.now(),
    });

    const res = await request("http://localhost:5071")
      .post("/delegations/revoke")
      .send({ delegator: "user1", proposalId: "p1" });

    expect(res.status).toBe(200);
    expect(res.body.removed).toBe(1);
    expect(delegations.length).toBe(0);
  });

  it("returns 404 if no delegation found", async () => {
    delegations.length = 0;
    const res = await request("http://localhost:5071")
      .post("/delegations/revoke")
      .send({ delegator: "userX", proposalId: "pZ" });

    expect(res.status).toBe(404);
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "dev:revoke": "ts-node src/delegationRevocation.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N348.

