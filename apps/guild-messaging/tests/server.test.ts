
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("history endpoint returns array", async () => {
  const res = await request("http://localhost:9160").get("/api/messages/design");
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});


