
/**
 * GNEW · N344 — AI-Powered Governance Audit
 * Rol: Backend + AI Integration
 * Objetivo: Implementar servicio que use IA para auditar propuestas de votación,
 * detectando inconsistencias, sesgos o riesgos.
 */

import express, { Request, Response } from "express";
import pino from "pino";
import { analyzeProposal } from "./services/aiAnalyzer";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
app.use(express.json());

interface AuditRequest {
  proposalId: string;
  content: string;
}

app.post("/audit/proposal", async (req: Request, res: Response) => {
  const { proposalId, content }: AuditRequest = req.body;

  if (!proposalId || !content) {
    return res.status(400).json({ error: "Missing proposalId or content" });
  }

  try {
    const auditReport = await analyzeProposal(content);
    logger.info({ proposalId }, "Audit completed");
    res.json({ proposalId, auditReport });
  } catch (err) {
    logger.error({ err }, "Audit failed");
    res.status(500).json({ error: "Audit failed" });
  }
});

export function startAIAudit(port = 4040) {
  return app.listen(port, () => {
    logger.info(`AI Audit API running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startAIAudit();
}


