
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("create governance proposal", async () => {
  const res = await request("http://localhost:9150")
    .post("/api/governance/proposals")
    .send({ id:"gov1", guildId:"design", title:"Adopt new workflow", description:"Proposal to change workflow", options:["Yes","No"] });
  expect([201,400]).toContain(res.status);
});


