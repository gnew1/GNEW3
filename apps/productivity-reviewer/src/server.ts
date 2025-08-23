
import express from "express";
import pino from "pino";
import { z } from "zod";

const log = pino();
const app = express();
app.use(express.json());

type Review = { id: string; guildId: string; reviewer: string; reviewee: string; score: number; feedback: string; timestamp: number };
const reviews: Review[] = [];

const ReviewSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  reviewer: z.string(),
  reviewee: z.string(),
  score: z.number().min(1).max(5),
  feedback: z.string()
});

// Submit review
app.post("/api/reviews", (req,res) => {
  const parsed = ReviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const review: Review = { ...parsed.data, timestamp: Date.now() };
  reviews.push(review);
  log.info({ review }, "Review recorded");
  res.status(201).json(review);
});

// List reviews
app.get("/api/reviews/:guildId", (req,res) => {
  const { guildId } = req.params;
  res.json(reviews.filter(r => r.guildId === guildId));
});

// Aggregate review scores
app.get("/api/reviews/:guildId/aggregate", (req,res) => {
  const { guildId } = req.params;
  const subset = reviews.filter(r => r.guildId === guildId);
  const agg: Record<string,{count:number;avg:number}> = {};
  for (const r of subset) {
    if (!agg[r.reviewee]) agg[r.reviewee] = { count: 0, avg: 0 };
    agg[r.reviewee].count++;
    agg[r.reviewee].avg = ((agg[r.reviewee].avg*(agg[r.reviewee].count-1))+r.score)/agg[r.reviewee].count;
  }
  res.json(agg);
});

const port = Number(process.env.PORT ?? 9130);
app.listen(port, () => log.info({ port }, "Productivity Reviewer service up"));


