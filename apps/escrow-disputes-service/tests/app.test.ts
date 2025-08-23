
import request from "supertest";
import app from "../src/app";

describe("escrow-disputes-service", () => {
  it("healthz", async () => {
    const r = await request(app).get("/healthz");
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it("builds typed data and queues disputes", async () => {
    const b = await request(app).post("/settlement/build").send({
      dealId: 1,
      buyerAmount: "10",
      sellerAmount: "90",
      deadline: Math.floor(Date.now()/1000)+3600,
      chainId: 31337,
      verifyingContract: "0x0000000000000000000000000000000000000001"
    });
    expect(b.status).toBe(200);
    expect(b.body.domain.name).toBe("GNEW-Escrow");

    const q = await request(app).post("/queue/open").send({ dealId: 1, priority: 2 });
    expect(q.status).toBe(201);
    const list = await request(app).get("/queue");
    expect(list.body.length).toBeGreaterThan(0);
  });

  it("stores evidence metadata", async () => {
    const e = await request(app).post("/evidence").send({
      dealId: 99,
      uri: "https://example.com/doc",
      hash: "0x" + "ab".repeat(32)
    });
    expect(e.status).toBe(201);
    expect(e.body.ok).toBe(true);
  });
});


