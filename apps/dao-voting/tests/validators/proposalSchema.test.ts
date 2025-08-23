
import { validateProposal } from "../../src/validators/proposalSchema";

describe("proposalSchema", () => {
  it("valida propuesta correcta", () => {
    const input = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Implementar nueva política de recompensas",
      description: "Se propone implementar un sistema de recompensas basado en niveles...",
      creatorId: "user123",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      options: ["A favor", "En contra"],
    };

    expect(() => validateProposal(input)).not.toThrow();
  });

  it("lanza error si faltan campos", () => {
    const badInput = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Corto",
    };

    expect(() => validateProposal(badInput)).toThrow();
  });

  it("lanza error si opciones son menos de dos", () => {
    const badInput = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Título válido",
      description: "Descripción suficientemente larga para pasar validación...",
      creatorId: "user123",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      options: ["Solo una"],
    };

    expect(() => validateProposal(badInput)).toThrow();
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "test:validators": "jest tests/validators/**/*.test.ts"
  },
  "dependencies": {
    "zod": "^3.23.8"
  }
}


✅ Puntero interno actualizado: último ejecutado N351.

