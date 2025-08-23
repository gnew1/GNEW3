
import { Router } from "express";
import { ingest } from "../ingest.js";

export const events = Router();

events.post("/ingest", (req, res) => {
  try {
    const out = ingest(req.body);
    res.json({ ok: true, ...out });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});


