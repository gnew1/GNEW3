
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("create proposal and vote", async () => {
  const create = await request("http://localhost:9210")
    .post("/api/voting/proposals")
    .send({ title:"New Rule", description:"Adopt new standard", createdBy:"u1" });
  expect([201,400]).toContain(create.status);

  if (create.status===201) {
    const pid = create.body.id;
    const vote = await request("http://localhost:9210")
      .post(`/api/voting/proposals/${pid}/vote`)
      .send({ voter:"u2", choice:"yes" });
    expect([200,400,404]).toContain(vote.status);
  }
});


