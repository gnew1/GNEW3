
import request from "supertest";
import { startRevocationService } from "../src/revocationService";

let server: any;

beforeAll((done) => {
  server = startRevocationService(5060);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("Delegation Revocation", () => {
  it("rejects missing fields", async () => {
    const res = await request("http://localhost:5060")
      .delete("/vote/delegation/revoke")
      .send({});
    expect(res.status).toBe(400);
  });

  it("handles non-existing delegation", async () => {
    const res = await request("http://localhost:5060")
      .delete("/vote/delegation/revoke")
      .send({ delegator: "ghost", proposalId: "none" });
    expect(res.status).toBe(404);
  });

  it("revokes an existing delegation", async () => {
    // Insert mock delegation directly for test
    const mockDelegation = {
      delegator: "user1",
      delegate: "user2",
      proposalId: "p1",
      timestamp: Date.now(),
    };

    // @ts-ignore
    const { delegations } = require("../src/revocationService");
    delegations.push(mockDelegation);

    const res = await request("http://localhost:5060")
      .delete("/vote/delegation/revoke")
      .send({ delegator: "user1", proposalId: "p1" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "dev:revocation": "ts-node src/revocationService.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N346.

