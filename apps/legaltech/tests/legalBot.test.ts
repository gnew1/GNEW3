
import request from "supertest";
import { startLegalBot } from "../src/legalBot";

let server: any;

beforeAll((done) => {
  server = startLegalBot(5004);
  setTimeout(done, 300);
});

afterAll((done) => {
  server.close(done);
});

describe("Legal Bot", () => {
  it("should reject missing params", async () => {
    const res = await request("http://localhost:5004").post("/legalbot").send({});
    expect(res.status).toBe(400);
  });

  it("should return answer from FAQ or fallback", async () => {
    const res = await request("http://localhost:5004")
      .post("/legalbot")
      .send({ user: "user123", question: "How to handle GDPR data?" });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBeDefined();
  });
});


/apps/legaltech/package.json (fragmento)

{
  "scripts": {
    "dev:legalbot": "ts-node src/legalBot.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.5",
    "pino": "^9.4.0",
    "openai": "^4.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "supertest": "^6.3.4",
    "jest": "^29.7.0"
  }
}


