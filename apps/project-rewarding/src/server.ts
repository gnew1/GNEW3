
import express from "express";
import pino from "pino";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const log = pino();
const app = express();
app.use(express.json());

/**
 * Project Rewarding Service
 * Assigns Gnew0 and Gnews tokens as rewards for project contributions.
 */
type Reward = {
  id: string;
  projectId: string;
  userId: string;
  token: "Gnew0" | "Gnews";
  amount: number;
  reason: string;
  createdAt: number;
};

const rewards: Reward[] = [];

const RewardSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
  token: z.enum(["Gnew0","Gnews"]),
  amount: z.number().positive(),
  reason: z.string()
});

// Create reward
app.post("/api/project-rewarding", (req,res) => {
  const parsed = RewardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const reward: Reward = { id: uuidv4(), ...parsed.data, createdAt: Date.now() };
  rewards.push(reward);
  log.info({ reward }, "Reward assigned");
  res.status(201).json(reward);
});

// List rewards by project
app.get("/api/project-rewarding/project/:projectId", (req,res) => {
  res.json(rewards.filter(r => r.projectId === req.params.projectId));
});

// List rewards by user
app.get("/api/project-rewarding/user/:userId", (req,res) => {
  res.json(rewards.filter(r => r.userId === req.params.userId));
});

const port = Number(process.env.PORT ?? 9220);
app.listen(port, () => log.info({ port }, "Project Rewarding service running"));


