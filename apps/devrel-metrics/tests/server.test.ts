
import { test, expect } from "vitest";
import request from "supertest";
import express from "express";
import { Registry } from "prom-client";

test("record endpoint rejects bad body", async () => {
  const mod = await import("../src/server");
  const app = express();
  const res = await request(app).post("/api/record").send({});
  expect(res.status).toBe(400);
});


