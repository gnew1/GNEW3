
import request from "supertest";
import { ethers } from "ethers";

import "../services/fraud/m8-fraud-detector";

const baseUrl = "http://localhost:4008";

describe("M8 Fraud Detector", () => {
  it("rechaza sin tx", async () => {
    const res = await request(baseUrl).post("/analyze").send({});
    expect(res.status).toBe(400);
  });

  it("analiza tx válida", async () => {
    const res = await request(baseUrl)
      .post("/analyze")
      .send({
        tx: { hash: "0xabc", value: "2000000000000000000", gasLimit: "30000" },
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("score");
    expect(res.body).toHaveProperty("flagged");
  });
});


