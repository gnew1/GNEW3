import app from "../src/app";

describe("escrow-disputes-service", () => {
  let base: URL;
  let server: any;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address() as any;
        base = new URL(`http://127.0.0.1:${port}`);
        resolve();
      });
    });
  });

  afterAll(() => server.close());

  it("healthz", async () => {
    const r = await fetch(new URL("/healthz", base));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
  });

  it("builds typed data and queues disputes", async () => {
    const bRes = await fetch(new URL("/settlement/build", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dealId: 1,
        buyerAmount: "10",
        sellerAmount: "90",
        deadline: Math.floor(Date.now() / 1000) + 3600,
        chainId: 31337,
        verifyingContract: "0x0000000000000000000000000000000000000001"
      })
    });
    expect(bRes.status).toBe(200);
    const b = await bRes.json();
    expect(b.domain.name).toBe("GNEW-Escrow");

    const qRes = await fetch(new URL("/queue/open", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId: 1, priority: 2 })
    });
    expect(qRes.status).toBe(201);
    const list = await fetch(new URL("/queue", base));
    const listBody = await list.json();
    expect(listBody.length).toBeGreaterThan(0);
  });

  it("stores evidence metadata", async () => {
    const eRes = await fetch(new URL("/evidence", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dealId: 99,
        uri: "https://example.com/doc",
        hash: "0x" + "ab".repeat(32)
      })
    });
    expect(eRes.status).toBe(201);
    const e = await eRes.json();
    expect(e.ok).toBe(true);
  });

  it("validates settlement verify payload", async () => {
    const payload = {
      domain: {
        name: "GNEW-Escrow",
        version: "1",
        chainId: 31337,
        verifyingContract: "0x0000000000000000000000000000000000000001",
      },
      types: {
        Settlement: [
          { name: "dealId", type: "uint256" },
          { name: "buyerAmount", type: "uint256" },
          { name: "sellerAmount", type: "uint256" },
          { name: "deadline", type: "uint64" }
        ]
      },
      value: {
        dealId: 1,
        buyerAmount: "10",
        sellerAmount: "90",
        deadline: Math.floor(Date.now() / 1000) + 3600
      },
      sigBuyer: "0x" + "aa".repeat(32) + "bb".repeat(32) + "1b",
      sigSeller: "0x" + "cc".repeat(32) + "dd".repeat(32) + "1c",
      buyer: "0x0000000000000000000000000000000000000002",
      seller: "0x0000000000000000000000000000000000000003"
    };
    const badResp = await fetch(new URL("/settlement/verify", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, buyer: "not-an-address" })
    });
    expect(badResp.status).toBe(400);
  });
});
