
import { expect } from "chai";
import request from "supertest";
import { MongoClient } from "mongodb";
import { spawn } from "child_process";

describe("M15 Telemetry Collector", () => {
  let server: any;
  let db: any;
  let client: any;

  before(async () => {
    client = new MongoClient("mongodb://localhost:27017");
    await client.connect();
    db = client.db("gnew_telemetry_test");
    server = spawn("ts-node", ["services/telemetry/collector.ts"], {
      env: { ...process.env, MONGO_URI: "mongodb://localhost:27017/gnew_telemetry_test" }
    });
  });

  after(async () => {
    await client.close();
    server.kill();
  });

  it("debería correlacionar eventos off-chain y on-chain", async () => {
    const traceId = "trace-123";
    await request("http://localhost:4000")
      .post("/ingest/offchain")
      .send({ traceId, sessionId: "s1", service: "web", metrics: { latency: 100 } })
      .expect(200);

    await request("http://localhost:4000")
      .post("/ingest/onchain")
      .send({ traceId, txHash: "0x123", eventName: "Vote", payload: { choice: 1 } })
      .expect(200);

    const res = await request("http://localhost:4000").get(`/correlate/${traceId}`).expect(200);
    expect(res.body.traceId).to.equal(traceId);
    expect(res.body.off).to.have.length(1);
    expect(res.body.on).to.have.length(1);
  });
});


