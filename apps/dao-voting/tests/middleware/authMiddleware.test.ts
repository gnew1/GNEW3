
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../../src/middleware/authMiddleware";

const app = express();
app.get("/protected", authMiddleware, (req, res) => {
  res.json({ message: "Acceso concedido" });
});

describe("authMiddleware", () => {
  const secret = process.env.JWT_SECRET || "gnew_default_secret";
  const validToken = jwt.sign({ id: "user123", role: "member" }, secret);

  it("rechaza acceso sin token", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
  });

  it("rechaza acceso con token inválido", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer token_invalido");
    expect(res.status).toBe(403);
  });

  it("acepta acceso con token válido", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Acceso concedido");
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "test:middleware": "jest tests/middleware/**/*.test.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N354.

