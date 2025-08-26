
import { test, expect } from "vitest";
import handler from "../src/pages/api/tutorials";

function createMocks({ method = "GET", body = {} } = {}) {
  const req: any = { method, body };
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

test("tutorials api returns list", async () => {
  const { req, res } = createMocks({ method: "GET" });
  await handler(req as any, res as any);
  const data = res._getJSONData();
  expect(data).toHaveLength(2);
  expect(data[0]).toHaveProperty("title");
});


