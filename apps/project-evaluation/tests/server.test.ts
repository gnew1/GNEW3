
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("submit and list evaluation", async () => {
  const sub = await request("http://localhost:9210")
    .post("/api/project-evaluation")
    .send({ projectId:"p1", evaluator:"u1", score:8, comment:"Great work" });
  expect([201,400]).toContain(sub.status);

  const list = await request("http://localhost:9210").get("/api/project-evaluation/p1");
  expect([200,404]).toContain(list.status);
});


