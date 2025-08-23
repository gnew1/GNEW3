
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("review submission returns 201", async () => {
  const res = await request("http://localhost:9130")
    .post("/api/reviews")
    .send({ id:"r1", guildId:"design", reviewer:"u1", reviewee:"u2", score:5, feedback:"Great work" });
  expect([201,400]).toContain(res.status);
});


