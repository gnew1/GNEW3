
/**
 * GNEW · N351 — Proposal Schema Validator
 * Objetivo: Validar la estructura de propuestas antes de ser persistidas en la DAO
 */

import { z } from "zod";

export const proposalSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  creatorId: z.string().min(3),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  options: z.array(z.string().min(1)).min(2),
});

export type ProposalInput = z.infer<typeof proposalSchema>;

export function validateProposal(input: unknown): ProposalInput {
  return proposalSchema.parse(input);
}


