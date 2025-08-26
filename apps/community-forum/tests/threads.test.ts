import { test, expect } from "vitest";
import listHandler from "../src/pages/api/threads/index";
import detailHandler from "../src/pages/api/threads/[id]";

type ReqInit = { method?: string; body?: any; query?: Record<string, any> };

function createMocks({ method = "GET", body = {}, query = {} }: ReqInit = {}) {
  const req: any = { method, body, query };
  let jsonData: unknown;
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      jsonData = data;
      return this;
    },
    end() {
      return this;
    },
    _getJSONData() {
      return jsonData;
    }
  };
  return { req, res };
}

test("threads api returns list", async () => {
  const { req, res } = createMocks({ method: "GET" });
  await listHandler(req as any, res as any);
  const data = res._getJSONData();
  expect(Array.isArray(data)).toBe(true);
  expect(res.statusCode).toBe(200);
});

test("existing thread returns 200", async () => {
  const { req, res } = createMocks({ method: "GET", query: { id: "1" } });
  await detailHandler(req as any, res as any);
  expect(res.statusCode).toBe(200);
});

test("missing thread returns 404", async () => {
  const { req, res } = createMocks({ method: "GET", query: { id: "nope" } });
  await detailHandler(req as any, res as any);
  expect(res.statusCode).toBe(404);
});
