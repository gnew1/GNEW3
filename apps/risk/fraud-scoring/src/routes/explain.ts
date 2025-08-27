
import { Router } from "express";
import { db } from "../db.js";

export const explain = Router();

explain.get("/:id", (req, res) => {
  const ev = db.prepare("SELECT features, score, decision, reasons FROM events WHERE id=?").get(req.params.id) as any;
  if (!ev) return res.status(404).json({ error: "Event not found" });
  
  const features = JSON.parse(ev.features || "{}");
  const reasons = JSON.parse(ev.reasons || "[]");
  
  res.json({
    id: req.params.id,
    score: ev.score,
    decision: ev.decision,
    features,
    reasons,
    explanation: {
      risk_factors: reasons.filter((r: any) => r.impact > 0),
      protective_factors: reasons.filter((r: any) => r.impact < 0),
      threshold: 0.5,
      confidence: Math.abs(ev.score - 0.5) * 2
    }
  });
});

