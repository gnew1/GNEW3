
import request from "supertest";
import { startZKPDelegation } from "../src/zkpDelegation";
import { generateProof } from "../src/zkpService";

let server: any;

beforeAll((done) => {
  server = startZKPDelegation(5020);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("ZKP Delegation", () => {
  it("rejects missing fields", async () => {
    const res = await request("http://localhost:5020").post("/zkp/delegate").send({});
    expect(res.status).toBe(400);
  });

  it("accepts valid delegation", async () => {
    const { proof, publicSignals } = await generateProof({ x: 42 });
    const res = await request("http://localhost:5020")
      .post("/zkp/delegate")
      .send({ delegator: "walletA", delegatee: "walletB", proof, publicSignals });

    expect(res.status).toBe(200);
    expect(res.body.delegatee).toBe("walletB");

    const list = await request("http://localhost:5020").get("/zkp/delegations");
    expect(list.body.delegations.walletA).toBe("walletB");
  });
});


/apps/dao-voting/package.json (fragmento actualizado)

{
  "scripts": {
    "dev:zkp-delegation": "ts-node src/zkpDelegation.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N342.

