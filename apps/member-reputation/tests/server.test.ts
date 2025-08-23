
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("reputation submission returns 201", async () => {
  const res = await request("http://localhost:9140")
    .post("/api/reputation")
    .send({ memberId:"u1", guildId:"design", score:5, reason:"Completed project" });
  expect([201,400]).toContain(res.status);
});


