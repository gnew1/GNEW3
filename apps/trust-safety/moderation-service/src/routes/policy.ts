
import { Router } from "express";
import { z } from "zod";
import { getPolicy, updatePolicy } from "../policy.js";

export const policy = Router();

policy.get("/", (_req, res) => res.json(getPolicy()));

policy.post("/", (req, res) => {
  const P = z.object({
    review: z.record(z.number().min(0).max(1)).optional(),
    block: z.record(z.number().min(0).max(2)).optional(),
    hard: z.array(z.string()).optional()
  });
  const p = P.parse(req.body ?? {});
  res.json(updatePolicy(p));
});


