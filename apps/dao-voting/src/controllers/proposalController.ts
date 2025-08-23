
/**
 * GNEW · N353 — Proposal Controller
 * Objetivo: Controlador REST para gestión de propuestas.
 */

import { Request, Response, Router } from "express";
import { ProposalService } from "../services/proposalService";

const router = Router();

// Crear propuesta
router.post("/", (req: Request, res: Response) => {
  try {
    const proposal = ProposalService.createProposal(req.body);
    res.status(201).json(proposal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Listar propuestas
router.get("/", (_req: Request, res: Response) => {
  const proposals = ProposalService.listProposals();
  res.json(proposals);
});

// Obtener propuesta por ID
router.get("/:id", (req: Request, res: Response) => {
  const proposal = ProposalService.getProposal(req.params.id);
  if (!proposal) {
    return res.status(404).json({ error: "Propuesta no encontrada" });
  }
  res.json(proposal);
});

// Cerrar propuesta
router.post("/:id/close", (req: Request, res: Response) => {
  const proposal = ProposalService.closeProposal(req.params.id);
  if (!proposal) {
    return res.status(404).json({ error: "Propuesta no encontrada" });
  }
  res.json(proposal);
});

export default router;


