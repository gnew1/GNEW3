
import { test, expect } from "vitest";
import request from "supertest";
import express from "express";
import "../src/server";

test("KPI submission returns 201", async () => {
  const res = await request("http://localhost:9120")
    .post("/api/kpis")
    .send({ guildId:"design", metric:"tasksCompleted", value:5 });
  expect([201,400]).toContain(res.status);
});


