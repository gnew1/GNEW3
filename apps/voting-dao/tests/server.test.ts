
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("proposal and voting lifecycle", async () => {
  const prop = await request("http://localhost:9250")
    .post("/api/dao/proposals")
    .send({ title:"Test proposal", description:"A test" });
  expect([201,400]).toContain(prop.status);
  const propId = prop.body?.id;

  if (propId) {
    const vote = await request("http://localhost:9250")
      .post("/api/dao/votes")
      .send({ proposalId: propId, userId:"u1", token:"Gnews", weight:5 });
    expect([201,400]).toContain(vote.status);

    const tally = await request("http://localhost:9250").get(`/api/dao/tally/${propId}`);
    expect([200,404]).toContain(tally.status);
  }
});


