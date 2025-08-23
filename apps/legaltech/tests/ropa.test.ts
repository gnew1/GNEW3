
import request from "supertest";
import express from "express";
import ropaRouter from "../src/ropa";

const app = express();
app.use(express.json());
app.use(ropaRouter);

describe("RoPA API", () => {
  it("should reject invalid payload", async () => {
    const res = await request(app).post("/ropa").send({});
    expect(res.status).toBe(400);
  });

  it("should create and list a record", async () => {
    const res = await request(app).post("/ropa").send({
      processName: "User registration",
      owner: "dpo@example.com",
      purpose: "Account creation",
      dataCategories: ["email", "password"],
      recipients: ["internal"],
      retentionPeriod: "5y"
    });
    expect(res.status).toBe(201);

    const list = await request(app).get("/ropa");
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
  });

  it("should export csv", async () => {
    const res = await request(app).get("/ropa/export");
    expect(res.status).toBe(200);
    expect(res.text).toContain("process_name");
  });
});


/apps/legaltech/package.json (fragmento actualizado)

{
  "scripts": {
    "dev": "ts-node src/ropa.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "express": "^4.19.0",
    "pg": "^8.11.5",
    "zod": "^3.22.4",
    "json2csv": "^6.0.0"
  }
}


