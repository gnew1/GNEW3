
import request from "supertest";
import { startConsentManager } from "../src/consentManager";

let server: any;

beforeAll((done) => {
  server = startConsentManager(5002);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("Consent Manager", () => {
  it("should grant consent", async () => {
    const res = await request("http://localhost:5002")
      .post("/consent")
      .send({ userId: "u1", purpose: "email_marketing", action: "GRANTED" });
    expect(res.status).toBe(200);
    expect(res.body.action).toBe("GRANTED");
  });

  it("should revoke consent", async () => {
    const res = await request("http://localhost:5002")
      .post("/consent")
      .send({ userId: "u1", purpose: "email_marketing", action: "REVOKED" });
    expect(res.status).toBe(200);
    expect(res.body.action).toBe("REVOKED");
    expect(res.body.version).toBeGreaterThan(1);
  });

  it("should list consents for a user", async () => {
    const res = await request("http://localhost:5002").get("/consent/u1");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});


/apps/legaltech/package.json (fragmento)

{
  "scripts": {
    "dev:consent": "ts-node src/consentManager.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "supertest": "^6.3.4"
  }
}


