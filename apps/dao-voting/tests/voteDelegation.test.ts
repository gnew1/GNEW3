
import request from "supertest";
import { startVoteDelegation } from "../src/voteDelegation";

let server: any;

beforeAll((done) => {
  server = startVoteDelegation(5050);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("Vote Delegation", () => {
  it("rejects missing fields", async () => {
    const res = await request("http://localhost:5050").post("/vote/delegate").send({});
    expect(res.status).toBe(400);
  });

  it("creates a delegation", async () => {
    const res = await request("http://localhost:5050")
      .post("/vote/delegate")
      .send({ delegator: "user1", delegate: "user2", proposalId: "p1" });
    expect(res.status).toBe(200);
    expect(res.body.delegation.delegator).toBe("user1");
  });

  it("prevents duplicate delegations", async () => {
    await request("http://localhost:5050")
      .post("/vote/delegate")
      .send({ delegator: "user3", delegate: "user4", proposalId: "p2" });

    const res = await request("http://localhost:5050")
      .post("/vote/delegate")
      .send({ delegator: "user3", delegate: "user4", proposalId: "p2" });

    expect(res.status).toBe(409);
  });

  it("lists delegations for a proposal", async () => {
    await request("http://localhost:5050")
      .post("/vote/delegate")
      .send({ delegator: "user5", delegate: "user6", proposalId: "p3" });

    const res = await request("http://localhost:5050").get("/vote/delegations/p3");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].proposalId).toBe("p3");
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "dev:vote-delegation": "ts-node src/voteDelegation.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N345.

