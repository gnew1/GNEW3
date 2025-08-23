
/**
 * GNEW · N352 — Proposal Service
 * Objetivo: Gestión de propuestas (crear, listar, obtener, cerrar).
 */

import { ProposalInput, validateProposal } from "../validators/proposalSchema";

interface Proposal extends ProposalInput {
  status: "open" | "closed";
}

const proposals: Map<string, Proposal> = new Map();

export class ProposalService {
  static createProposal(input: unknown): Proposal {
    const parsed = validateProposal(input);
    const proposal: Proposal = { ...parsed, status: "open" };
    proposals.set(proposal.id, proposal);
    return proposal;
  }

  static listProposals(): Proposal[] {
    return Array.from(proposals.values());
  }

  static getProposal(id: string): Proposal | undefined {
    return proposals.get(id);
  }

  static closeProposal(id: string): Proposal | undefined {
    const proposal = proposals.get(id);
    if (proposal) {
      proposal.status = "closed";
      proposals.set(id, proposal);
    }
    return proposal;
  }
}


