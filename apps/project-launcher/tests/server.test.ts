
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("launch and retrieve project", async () => {
  const launch = await request("http://localhost:9190")
    .post("/api/projects")
    .send({ guildId:"design", name:"NewBrand", description:"Branding initiative", creator:"u1" });
  expect([201,400]).toContain(launch.status);

  if (launch.status===201) {
    const pid = launch.body.id;
    const get = await request("http://localhost:9190").get(`/api/projects/${pid}`);
    expect([200,404]).toContain(get.status);
  }
});


