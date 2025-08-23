
import request from "supertest";
import { startPolicyEngine } from "../src/policyEngine";
import express from "express";

let server: any;

beforeAll((done) => {
  server = startPolicyEngine(5001);
  setTimeout(done, 300); // espera a que arranque
});

afterAll((done) => {
  server?.close(done);
});

describe("Policy Engine", () => {
  it("should sign a bundle", async () => {
    const res = await request("http://localhost:5001")
      .post("/policy/sign")
      .send({ bundle: "test" });
    expect(res.body.signature).toBeDefined();
  });

  it("should evaluate a simple policy", async () => {
    const res = await request("http://localhost:5001")
      .post("/policy/eval")
      .send({ policy: "example", input: { user: "admin" } });
    expect(res.status).toBe(200);
  });
});


/apps/legaltech/package.json (fragmento)

{
  "scripts": {
    "dev:policy": "ts-node src/policyEngine.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "supertest": "^6.3.4"
  }
}


