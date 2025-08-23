
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

type ReputationRecord = { memberId: string; guildId: string; score: number; reason: string; timestamp: number };
const reputation: ReputationRecord[] = [];

const ReputationSchema = z.object({
  memberId: z.string(),
  guildId: z.string(),
  score: z.number().min(-10).max(10),
  reason: z.string()
});

// Add reputation
app.post("/api/reputation", (req,res) => {
  const parsed = ReputationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const rec: ReputationRecord = { ...parsed.data, timestamp: Date.now() };
  reputation.push(rec);
  log.info({ rec }, "Reputation event recorded");
  res.status(201).json(rec);
});

// Member score
app.get("/api/reputation/:guildId/:memberId", (req,res) => {
  const { guildId, memberId } = req.params;
  const memberRecords = reputation.filter(r => r.guildId===guildId && r.memberId===memberId);
  const total = memberRecords.reduce((a,b) => a+b.score, 0);
  res.json({ guildId, memberId, total, history: memberRecords });
});

// Guild leaderboard
app.get("/api/reputation/:guildId", (req,res) => {
  const { guildId } = req.params;
  const subset = reputation.filter(r => r.guildId===guildId);
  const scores: Record<string,number> = {};
  for (const r of subset) scores[r.memberId] = (scores[r.memberId]||0)+r.score;
  const leaderboard = Object.entries(scores).map(([memberId,total])=>({memberId,total}))
    .sort((a,b)=>b.total-a.total);
  res.json(leaderboard);
});

const port = Number(process.env.PORT ?? 9140);
app.listen(port, () => log.info({ port }, "Member Reputation service up"));


