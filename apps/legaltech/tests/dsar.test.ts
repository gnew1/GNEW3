
import request from "supertest";
import express from "express";
import dsarRouter from "../src/dsar";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(dsarRouter);

function sign(userId: string) {
  return crypto.createHash("sha256").update(userId + process.env.DSAR_SECRET).digest("hex");
}

describe("DSAR automation", () => {
  const userId = "testuser";
  const signature = sign(userId);

  it("allows access request with valid signature", async () => {
    const res = await request(app).post("/dsar/access").send({ userId, signature });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(`${userId}@example.com`);
  });

  it("denies access with invalid signature", async () => {
    const res = await request(app).post("/dsar/access").send({ userId, signature: "bad" });
    expect(res.status).toBe(403);
  });

  it("executes delete with valid signature", async () => {
    const res = await request(app).post("/dsar/delete").send({ userId, signature });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Deleted");
  });
});


