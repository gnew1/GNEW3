
import { Router } from "express";
import { z } from "zod";
import { getPolicy, updatePolicy } from "../policy.js";

export const policy = Router();

policy.get("/", (_req, res) => {
  res.json(getPolicy());
});

policy.post("/", (req, res) => {
  const P = z.object({
    allowThreshold: z.number().min(0).max(1).optional(),
    reviewThreshold: z.number().min(0).max(1).optional(),
    hardBlockGeoDistanceKm: z.number().min(0).optional(),
    hardBlockVelocityIp: z.number().int().min(0).optional(),
    hardBlockVelocityDevice: z.number().int().min(0).optional()
  });
  const p = P.parse(req.body ?? {});
  res.json(updatePolicy(p));
});


