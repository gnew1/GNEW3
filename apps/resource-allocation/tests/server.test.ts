
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("create allocation and list", async () => {
  const res = await request("http://localhost:9190")
    .post("/api/resource-allocation")
    .send({ projectId:"p1", guildId:"design", resource:"tokens", amount:100 });
  expect([201,400]).toContain(res.status);

  const list = await request("http://localhost:9190").get("/api/resource-allocation/design");
  expect([200,404]).toContain(list.status);
});


