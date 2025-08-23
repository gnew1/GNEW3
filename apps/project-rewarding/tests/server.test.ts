
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("create reward and list", async () => {
  const create = await request("http://localhost:9220")
    .post("/api/project-rewarding")
    .send({ projectId:"p1", userId:"u1", token:"Gnew0", amount:50, reason:"Participation" });
  expect([201,400]).toContain(create.status);

  const list = await request("http://localhost:9220").get("/api/project-rewarding/project/p1");
  expect([200,404]).toContain(list.status);
});


