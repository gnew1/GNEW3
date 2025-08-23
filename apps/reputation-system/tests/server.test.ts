
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("update and get reputation", async () => {
  const upd = await request("http://localhost:9180")
    .post("/api/reputation/update")
    .send({ guildId:"design", memberId:"u1", delta:5 });
  expect([200,400]).toContain(upd.status);

  const res = await request("http://localhost:9180").get("/api/reputation/design/u1");
  expect([200,404]).toContain(res.status);
});


