
import { Router } from "express";
import { z } from "zod";
import { getPolicy, setPolicy } from "../policy.js";

export const policy = Router();

policy.get("/", (_req, res) => res.json(getPolicy()));

policy.post("/", (req, res) => {
  const P = z.object({ warnThreshold: z.number().min(0).max(1).optional(), blockThreshold: z.number().min(0).max(1).optional() });
  const p = P.parse(req.body ?? {});
  res.json(setPolicy(p));
});


