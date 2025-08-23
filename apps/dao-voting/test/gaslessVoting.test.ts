
import request from "supertest";
import { startGaslessVoting } from "../src/gaslessVoting";

let server: any;

beforeAll(() => {
  server = startGaslessVoting(6060);
});

afterAll(() => {
  server.close();
});

describe("Gasless Voting API", () => {
  it("should reject missing fields", async () => {
    const res = await request(server).post("/gasless/vote").send({});
    expect(res.status).toBe(400);
  });

  it("should reject invalid signature", async () => {
    const res = await request(server).post("/gasless/vote").send({
      proposalId: 1,
      support: true,
      signature: "0xdeadbeef",
      voter: "0x1234567890123456789012345678901234567890"
    });
    expect(res.status).toBe(400);
  });
});


/apps/dao-voting/package.json (script de pruebas actualizado)

{
  "scripts": {
    "test": "jest --passWithNoTests",
    "start:gasless": "ts-node src/gaslessVoting.ts"
  }
}


