
import request from "supertest";
import express from "express";
import proposalController from "../../src/controllers/proposalController";

const app = express();
app.use(express.json());
app.use("/proposals", proposalController);

describe("ProposalController", () => {
  const baseProposal = {
    id: "22222222-2222-2222-2222-222222222222",
    title: "Test de propuestas REST",
    description: "Descripción de la propuesta de prueba",
    creatorId: "user456",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    options: ["Aceptar", "Rechazar"],
  };

  it("POST /proposals crea propuesta", async () => {
    const res = await request(app).post("/proposals").send(baseProposal);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(baseProposal.id);
  });

  it("GET /proposals lista propuestas", async () => {
    const res = await request(app).get("/proposals");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /proposals/:id obtiene propuesta", async () => {
    const res = await request(app).get(`/proposals/${baseProposal.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(baseProposal.id);
  });

  it("POST /proposals/:id/close cierra propuesta", async () => {
    const res = await request(app).post(`/proposals/${baseProposal.id}/close`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("closed");
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "test:controllers": "jest tests/controllers/**/*.test.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N353.

