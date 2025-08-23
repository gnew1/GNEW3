
import request from "supertest";
import { startZKPRevocation } from "../src/zkpRevocation";
import { generateProof } from "../src/zkpService";

let server: any;

beforeAll((done) => {
  server = startZKPRevocation(5030);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("ZKP Delegation Revocation", () => {
  it("rejects missing fields", async () => {
    const res = await request("http://localhost:5030").post("/zkp/revoke").send({});
    expect(res.status).toBe(400);
  });

  it("revokes existing delegation", async () => {
    const { proof, publicSignals } = await generateProof({ x: 99 });

    // preload delegation
    await request("http://localhost:5030")
      .get("/zkp/delegations")
      .then((res) => {
        res.body.delegations["walletX"] = "walletY";
      });

    const res = await request("http://localhost:5030")
      .post("/zkp/revoke")
      .send({ delegator: "walletX", proof, publicSignals });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("revoked");
  });
});


/apps/dao-voting/package.json (fragmento actualizado)

{
  "scripts": {
    "dev:zkp-revocation": "ts-node src/zkpRevocation.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N343.

