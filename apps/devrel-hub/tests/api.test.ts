
import { test, expect } from "vitest";
import handler from "../src/pages/api/tutorials";
import { createMocks } from "node-mocks-http";

test("tutorials api returns list", async () => {
  const { req, res } = createMocks({ method: "GET" });
  await handler(req as any, res as any);
  const data = res._getJSONData();
  expect(data).toHaveLength(2);
  expect(data[0]).toHaveProperty("title");
});


