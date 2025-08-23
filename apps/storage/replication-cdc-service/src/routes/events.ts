
import { Router } from "express";
import { ingestEvents, listEvents, requeue } from "../cdc.js";
import { z } from "zod";

export const events = Router();

events.post("/ingest", (req, res) => {
  try {
    const out = ingestEvents(req.body);
    res.json({ ok: true, ...out });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});

events.get("/", (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const keyLike = req.query.keyLike ? String(req.query.keyLike) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const offset = req.query.offset ? Number(req.query.offset) : undefined;
  res.json({ ok: true, items: listEvents({ status, keyLike, limit, offset }) });
});

events.post("/requeue", (req, res) => {
  const P = z.object({ ids: z.array(z.string()).optional(), allErrors: z.boolean().optional() });
  try {
    const p = P.parse(req.body ?? {});
    const out = requeue(p.ids, p.allErrors === true);
    res.json({ ok: true, ...out });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});


