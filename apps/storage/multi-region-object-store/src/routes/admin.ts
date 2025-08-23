
import { Router } from "express";
import { tickHealth, getActive, setActive, getHealth } from "../state.js";
import { cfg } from "../config.js";
import { presign } from "../s3.js";
import { z } from "zod";

export const admin = Router();

admin.get("/healthz", async (_req, res) => {
  await tickHealth(cfg.failoverMode === "auto");
  res.json({ ok: true, active: getActive(), health: getHealth(), mode: cfg.failoverMode });
});

admin.get("/state", (_req, res) => {
  res.json({ active: getActive(), mode: cfg.failoverMode });
});

admin.post("/failover/promote", (req, res) => {
  const P = z.object({ to: z.enum(["primary","secondary"]) });
  try {
    const { to } = P.parse(req.body ?? {});
    setActive(to);
    res.json({ ok: true, active: to });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});

// pre-sign
admin.post("/sign", async (req, res) => {
  const P = z.object({
    op: z.enum(["get","put"]),
    key: z.string().min(1),
    region: z.enum(["primary","secondary"]).optional(),
    contentType: z.string().optional(),
    expiresSec: z.number().int().min(60).max(86400).optional()
  });
  try {
    const p = P.parse(req.body ?? {});
    const region = p.region ?? getActive();
    const url = await presign(region, p.op, p.key, p.expiresSec ?? cfg.presignExpires, p.contentType);
    res.json({ url, region, op: p.op, expiresSec: p.expiresSec ?? cfg.presignExpires });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});


