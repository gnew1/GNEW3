
import { ProposalService } from "../../src/services/proposalService";

describe("ProposalService", () => {
  const baseProposal = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Nueva política de tokens",
    description: "Se propone implementar una política de tokens para GNEW...",
    creatorId: "user123",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    options: ["Sí", "No"],
  };

  it("crea propuesta válida", () => {
    const result = ProposalService.createProposal(baseProposal);
    expect(result.id).toBe(baseProposal.id);
    expect(result.status).toBe("open");
  });

  it("lista propuestas creadas", () => {
    ProposalService.createProposal({ ...baseProposal, id: "11111111-1111-1111-1111-111111111111" });
    const proposals = ProposalService.listProposals();
    expect(proposals.length).toBeGreaterThanOrEqual(2);
  });

  it("obtiene propuesta por ID", () => {
    const proposal = ProposalService.getProposal(baseProposal.id);
    expect(proposal?.title).toBe("Nueva política de tokens");
  });

  it("cierra propuesta existente", () => {
    const closed = ProposalService.closeProposal(baseProposal.id);
    expect(closed?.status).toBe("closed");
  });
});


/apps/dao-voting/package.json (fragmento)

{
  "scripts": {
    "test:services": "jest tests/services/**/*.test.ts"
  }
}


✅ Puntero interno actualizado: último ejecutado N352.

