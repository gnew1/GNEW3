
import express from "express";
import pino from "pino";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const log = pino();
const app = express();
app.use(express.json());

/**
 * Project Evaluation Service
 * Allows guild members to evaluate and rate launched projects based on criteria.
 */
type Evaluation = {
  id: string;
  projectId: string;
  evaluator: string;
  score: number; // 0-10
  comment?: string;
  createdAt: number;
};

const evaluations: Evaluation[] = [];

const EvalSchema = z.object({
  projectId: z.string(),
  evaluator: z.string(),
  score: z.number().min(0).max(10),
  comment: z.string().optional()
});

// Submit evaluation
app.post("/api/project-evaluation", (req,res) => {
  const parsed = EvalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const evalRecord: Evaluation = { id: uuidv4(), ...parsed.data, createdAt: Date.now() };
  evaluations.push(evalRecord);
  log.info({ evalRecord }, "Project evaluation submitted");
  res.status(201).json(evalRecord);
});

// List evaluations by project
app.get("/api/project-evaluation/:projectId", (req,res) => {
  const { projectId } = req.params;
  res.json(evaluations.filter(e => e.projectId === projectId));
});

// Aggregate score
app.get("/api/project-evaluation/:projectId/aggregate", (req,res) => {
  const { projectId } = req.params;
  const subset = evaluations.filter(e => e.projectId === projectId);
  if (subset.length === 0) return res.json({ avg: 0, count: 0 });
  const avg = subset.reduce((a,b)=>a+b.score,0) / subset.length;
  res.json({ avg, count: subset.length });
});

const port = Number(process.env.PORT ?? 9210);
app.listen(port, () => log.info({ port }, "Project Evaluation service running"));


