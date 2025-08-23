
import request from "supertest";

const baseUrl = "http://localhost:4010";

describe("M10 Query Engine", () => {
  it("ejecuta query de conteo", async () => {
    const res = await request(baseUrl)
      .post("/query")
      .send({ dataset: "test", aggregate: "count", field: "value" });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(3);
  });

  it("ejecuta query privada", async () => {
    const res = await request(baseUrl)
      .post("/query")
      .send({ dataset: "test", aggregate: "sum", field: "value", private: true });
    expect(res.status).toBe(200);
    expect(res.body.proof).toBeDefined();
  });
});


