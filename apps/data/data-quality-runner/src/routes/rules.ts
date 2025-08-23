
import { Router } from "express";
import { z } from "zod";
import { RuleSchema, upsertRule, listRules, removeRule } from "../rules.js";

export const rules = Router();

rules.post("/rules/upsert", (req, res) => {
  try {
    const body = RuleSchema.parse(req.body ?? {});
    if (!body.location && !(body.db && body.table)) {
      return res.status(400).json({ ok: false, error: "location_or_db.table_required" });
    }
    const id = upsertRule(body);
    res.json({ ok: true, id });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message ?? String(e) });
  }
});

rules.get("/rules", (req, res) => {
  const db = req.query.db ? String(req.query.db) : undefined;
  const table = req.query.table ? String(req.query.table) : undefined;
  const items = listRules(db, table);
  res.json({ ok: true, items });
});

rules.delete("/rules/:id", (req, res) => {
  removeRule(req.params.id);
  res.json({ ok: true });
});


