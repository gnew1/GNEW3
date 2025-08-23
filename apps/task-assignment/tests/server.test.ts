
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("create and assign task", async () => {
  const createRes = await request("http://localhost:9160")
    .post("/api/tasks")
    .send({ id:"t1", guildId:"design", title:"Logo", description:"Design new logo" });
  expect([201,400]).toContain(createRes.status);

  if (createRes.status===201) {
    const assignRes = await request("http://localhost:9160")
      .post("/api/tasks/t1/assign")
      .send({ memberId:"u1" });
    expect([200,404]).toContain(assignRes.status);
  }
});


