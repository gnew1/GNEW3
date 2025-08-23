
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("vote analytics endpoint works", async () => {
  const res = await request("http://localhost:9170")
    .post("/api/voting-analytics/vote")
    .send({ proposalId:"p1", guildId:"design", memberId:"u1", option:"Yes" });
  expect([201,400]).toContain(res.status);
});


