
import request from "supertest";
import { startZKPVoting } from "../src/zkpVoting";
import { generateProof } from "../src/zkpService";

let server: any;

beforeAll((done) => {
  server = startZKPVoting(5010);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("ZKP Voting", () => {
  it("rejects missing fields", async () => {
    const res = await request("http://localhost:5010").post("/zkp/vote").send({});
    expect(res.status).toBe(400);
  });

  it("accepts valid proof and counts vote", async () => {
    const { proof, publicSignals } = await generateProof({ x: 1 });
    const res = await request("http://localhost:5010")
      .post("/zkp/vote")
      .send({ choice: "yes", proof, publicSignals });
    expect(res.status).toBe(200);

    const results = await request("http://localhost:5010").get("/zkp/results");
    expect(results.body.results.yes).toBeGreaterThan(0);
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "dev:zkp": "ts-node src/zkpVoting.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pino": "^9.4.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "supertest": "^6.3.4",
    "@types/express": "^4.17.21"
  }
}


✅ Puntero interno actualizado: último ejecutado N341.

