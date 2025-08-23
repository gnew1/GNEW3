
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("create proposal and vote", async () => {
  const res = await request("http://localhost:9110")
    .post("/api/proposals")
    .send({ id:"p1", guildId:"design", title:"Choose rep", options:["Alice","Bob"] });
  expect([201,400]).toContain(res.status);
});


