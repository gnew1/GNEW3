
import express from "express";
import request from "supertest";
import { requireRole, Role } from "../src/roleBasedAccess";

const app = express();

// Middleware de inyección de usuario para pruebas
function mockUser(role?: Role) {
  return (req: any, res: any, next: any) => {
    if (role) req.user = { id: "u1", role };
    next();
  };
}

app.get("/admin", mockUser("admin"), requireRole("admin"), (_req, res) => {
  res.json({ ok: true });
});

app.get("/mod", mockUser("moderator"), requireRole("moderator"), (_req, res) => {
  res.json({ ok: true });
});

app.get("/member", mockUser("member"), requireRole("member"), (_req, res) => {
  res.json({ ok: true });
});

describe("RBAC middleware", () => {
  it("permite acceso si el rol es suficiente", async () => {
    const res = await request(app).get("/admin");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("deniega acceso si el rol es insuficiente", async () => {
    const testApp = express();
    testApp.get("/restricted", mockUser("member"), requireRole("admin"), (_req, res) => {
      res.json({ ok: true });
    });
    const res = await request(testApp).get("/restricted");
    expect(res.status).toBe(403);
  });

  it("retorna 401 si no hay usuario autenticado", async () => {
    const testApp = express();
    testApp.get("/restricted", requireRole("member"), (_req, res) => {
      res.json({ ok: true });
    });
    const res = await request(testApp).get("/restricted");
    expect(res.status).toBe(401);
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "test:rbac": "jest tests/roleBasedAccess.test.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N349.

