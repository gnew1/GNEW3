
import request from "supertest";
import { startRegTechIntegration } from "../src/regtechIntegration";

let server: any;

beforeAll((done) => {
  server = startRegTechIntegration(5005);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("RegTech Integration", () => {
  it("rejects missing companyId", async () => {
    const res = await request("http://localhost:5005").post("/regtech/check").send({});
    expect(res.status).toBe(400);
  });

  it("accepts companyId and returns result", async () => {
    const res = await request("http://localhost:5005")
      .post("/regtech/check")
      .send({ companyId: "test123" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("companyId");
    expect(res.body).toHaveProperty("status");
  });
});


/apps/legaltech/package.json (fragmento)

{
  "scripts": {
    "dev:regtech": "ts-node src/regtechIntegration.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "express": "^4.18.2",
    "pg": "^8.11.5",
    "pino": "^9.4.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "supertest": "^6.3.4",
    "jest": "^29.7.0"
  }
}


✅ Puntero interno actualizado: último ejecutado N340.

