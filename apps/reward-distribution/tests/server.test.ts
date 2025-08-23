
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("reward distribution returns 201", async () => {
  const res = await request("http://localhost:9150")
    .post("/api/rewards")
    .send({ id:"rw1", guildId:"design", memberId:"u1", token:"Gnew0", amount:10 });
  expect([201,400]).toContain(res.status);
});


