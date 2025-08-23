
import request from "supertest";
import { startAuditTrail } from "../src/auditTrail";

let server: any;

beforeAll((done) => {
  server = startAuditTrail(5003);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("Audit Trail", () => {
  it("should insert audit record", async () => {
    const res = await request("http://localhost:5003")
      .post("/audit")
      .send({ actor: "user1", action: "UPDATE", target: "profile" });
    expect(res.status).toBe(200);
    expect(res.body.hash).toBeDefined();
  });

  it("should verify chain validity", async () => {
    const res = await request("http://localhost:5003").get("/audit/verify");
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });
});


/apps/legaltech/package.json (fragmento)

{
  "scripts": {
    "dev:audit": "ts-node src/auditTrail.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "supertest": "^6.3.4",
    "jest": "^29.7.0"
  }
}


