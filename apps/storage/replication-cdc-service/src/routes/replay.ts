
import { Router } from "express";
import { replayBatch } from "../cdc.js";
import { z } from "zod";

export const replay = Router();

replay.post("/run", async (req, res) => {
  const P = z.object({ limit: z.number().int().min(1).max(200).optional(), leaseSec: z.number().int().min(30).max(600).optional(), maxRetries: z.number().int().min(1).max(20).optional() });
  try {
    const p = P.parse(req.body ?? {});
    const out = await replayBatch(p);
    res.json({ ok: true, ...out });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});


