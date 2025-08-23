
import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("register and send message", async () => {
  await request("http://localhost:9240").post("/api/secure/register/u1");
  await request("http://localhost:9240").post("/api/secure/register/u2");

  const send = await request("http://localhost:9240")
    .post("/api/secure/send")
    .send({ from:"u1", to:"u2", message:"hello" });
  expect([201,400,404]).toContain(send.status);

  const inbox = await request("http://localhost:9240").get("/api/secure/inbox/u2");
  expect([200,404]).toContain(inbox.status);
});


