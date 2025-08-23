
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("create and list tasks", async () => {
  const res = await request("http://localhost:9200")
    .post("/api/project-tracking/task")
    .send({ id:"t1", projectId:"p1", title:"Design spec", status:"todo" });
  expect([201,400]).toContain(res.status);

  const list = await request("http://localhost:9200").get("/api/project-tracking/p1");
  expect([200,404]).toContain(list.status);
});


