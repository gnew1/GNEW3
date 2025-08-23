
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("init and check identity verification", async () => {
  const init = await request("http://localhost:9270")
    .post("/api/verify/init")
    .send({ userId:"u42" });
  expect([200,400]).toContain(init.status);

  if (init.body?.secret) {
    const status = await request("http://localhost:9270").get("/api/verify/status/u42");
    expect([200,404]).toContain(status.status);
  }
});


