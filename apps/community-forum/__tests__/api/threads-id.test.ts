import { test, expect } from "vitest";
import handler from "../../src/pages/api/threads/[id]";

function createMocks(id: any) {
  const req: any = { method: "GET", query: { id } };
  let jsonData: unknown = undefined;
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

test("returns 400 for invalid id", async () => {
  const { req, res } = createMocks(["1", "2"]);
  await handler(req as any, res as any);
  expect(res.statusCode).toBe(400);
  expect(res._getJSONData()).toBeNull();
});

test("returns 404 when thread not found", async () => {
  const { req, res } = createMocks("1");
  await handler(req as any, res as any);
  expect(res.statusCode).toBe(404);
  expect(res._getJSONData()).toBeNull();
});

