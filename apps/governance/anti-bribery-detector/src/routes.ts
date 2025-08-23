
import { Router } from "express";
import { z } from "zod";
import { detectForProposal, scoreVoter } from "./heuristics.js";
import { db } from "./db.js";

export const routes = Router();

routes.post("/detect/run", (req, res) => {
  const P = z.object({
    proposalId: z.string().optional(),
    sinceTs: z.number().int().optional(),
    untilTs: z.number().int().optional()
  });
  try {
    const p = P.parse(req.body ?? {});
    if (!p.proposalId && !p.sinceTs) return res.status(400).json({ ok: false, error: "proposalId_or_sinceTs_required" });

    if (p.proposalId) {
      const out = detectForProposal(p.proposalId);
      return res.json({ ok: true, mode: "proposal", ...out });
    }

    // rango temporal: detectar por cada voto en rango
    const votes = db.prepare("SELECT DISTINCT proposalId FROM votes WHERE ts>=? AND ts<=?").all(p.sinceTs!, p.untilTs ?? 9e12) as any[];
    let total = 0, flagged = 0;
    for (const row of votes) {
      const r = detectForProposal(row.proposalId);
      total += r.total; flagged += r.flagged;
    }
    res.json({ ok: true, mode: "range", total, flagged });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});

routes.get("/alerts", (req, res) => {
  const proposalId = req.query.proposalId ? String(req.query.proposalId) : undefined;
  const rows = proposalId
    ? db.prepare("SELECT * FROM alerts WHERE proposalId=? ORDER BY score DESC").all(proposalId)
    : db.prepare("SELECT * FROM alerts ORDER BY ts DESC LIMIT 500").all();
  res.json({ ok: true, items: rows });
});

routes.get("/entities/:address", (req, res) => {
  const a = req.params.address.toLowerCase();
  const ent = db.prepare("SELECT * FROM entities WHERE address=?").get(a) as any;
  const inEdges = db.prepare("SELECT * FROM edges WHERE toAddr=? ORDER BY lastTs DESC LIMIT 100").all(a);
  const outEdges = db.prepare("SELECT * FROM edges WHERE fromAddr=? ORDER BY lastTs DESC LIMIT 100").all(a);
  res.json({ ok: true, entity: ent ?? null, inEdges, outEdges });
});

routes.post("/evaluate", (req, res) => {
  const P = z.object({
    labels: z.array(z.object({ proposalId: z.string(), voter: z.string(), label: z.union([z.literal(0), z.literal(1)]) })).min(1),
    threshold: z.number().min(0).max(1).optional()
  });
  try {
    const p = P.parse(req.body ?? {});
    const th = p.threshold ?? 0.65;
    let tp=0, fp=0, fn=0, tn=0;
    for (const row of p.labels) {
      const v = db.prepare("SELECT ts FROM votes WHERE proposalId=? AND voter=? LIMIT 1").get(row.proposalId, row.voter.toLowerCase()) as any;
      if (!v) continue;
      const sc = scoreVoter(row.voter.toLowerCase(), v.ts).score;
      const pred = sc >= th ? 1 : 0;
      if (pred===1 && row.label===1) tp++; else
      if (pred===1 && row.label===0) fp++; else
      if (pred===0 && row.label===1) fn++; else tn++;
    }
    const precision = tp / Math.max(1, tp + fp);
    const recall    = tp / Math.max(1, tp + fn);
    const f1        = (2 * precision * recall) / Math.max(1e-9, precision + recall);
    res.json({ ok: true, threshold: th, counts: { tp, fp, fn, tn }, metrics: { precision, recall, f1 } });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});


