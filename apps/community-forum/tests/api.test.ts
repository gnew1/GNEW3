
import { test, expect } from "vitest";
import handler from "../src/pages/api/threads/index";
import { createMocks } from "node-mocks-http";

test("threads api returns list", async () => {
  const { req, res } = createMocks({ method: "GET" });
  await handler(req as any, res as any);
  const data = res._getJSONData();
  expect(Array.isArray(data)).toBe(true);
});


