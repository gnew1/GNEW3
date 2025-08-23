
import request from "supertest";
import "../services/identity/m9-key-did-manager";

const baseUrl = "http://localhost:4009";

describe("M9 Key & DID Manager", () => {
  it("crea un DID", async () => {
    const res = await request(baseUrl).post("/dids").send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("publicKey");
  });

  it("obtiene un DID inexistente", async () => {
    const res = await request(baseUrl).get("/dids/noexiste").send();
    expect(res.status).toBe(404);
  });

  it("asocia un device a un DID", async () => {
    const create = await request(baseUrl).post("/dids").send();
    const did = create.body.id;
    const res = await request(baseUrl)
      .post(`/dids/${did}/bind`)
      .send({ deviceId: "device-123" });
    expect(res.status).toBe(200);
    expect(res.body.authentication).toContain("device:device-123");
  });
});


