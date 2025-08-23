
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { executeRuleById, executeRulesForTable } from "../runner.js";

export const run = Router();

run.post("/run/execute", async (req, res) => {
  const A = z.object({ ruleId: z.string().optional(), db: z.string().optional(), table: z.string().optional() });
  try {
    const p = A.parse(req.body ?? {});
    if (p.ruleId) {
      const out = await executeRuleById(p.ruleId);
      return res.json({ ok: true, ...out });
    }
    if (p.db && p.table) {
      const out = await executeRulesForTable(p.db, p.table);
      return res.json({ ok: true, ...out });
    }
    return res.status(400).json({ ok: false, error: "ruleId_or_db_table_required" });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});

run.get("/runs/:runId", (req, res) => {
  const run = db.prepare("SELECT * FROM runs WHERE id=?").get(req.params.runId) as any;
  if (!run) return res.status(404).json({ ok: false, error: "not_found" });
  const results = db.prepare("SELECT ruleId, status, detail, createdAt FROM results WHERE runId=? ORDER BY createdAt ASC").all(req.params.runId) as any[];
  res.json({ ok: true, run, results: results.map(r => ({ ...r, detail: safe(r.detail) })) });
});

run.get("/reports/latest", (req, res) => {
  const dbName = String(req.query.db ?? "");
  const tableName = String(req.query.table ?? "");
  if (!dbName || !tableName) return res.status(400).json({ ok: false, error: "db_table_required" });
  const last = db.prepare("SELECT id FROM runs WHERE dbName=? AND tableName=? ORDER BY startedAt DESC LIMIT 1").get(dbName, tableName) as any;
  if (!last?.id) return res.json({ ok: true, run: null, results: [] });
  const run = db.prepare("SELECT * FROM runs WHERE id=?").get(last.id) as any;
  const results = db.prepare("SELECT ruleId, status, detail, createdAt FROM results WHERE runId=?").all(last.id) as any[];
  res.json({ ok: true, run, results: results.map(r => ({ ...r, detail: safe(r.detail) })) });
});

run.get("/metrics", (_req, res) => {
  const counts = db.prepare("SELECT status, COUNT(*) c FROM results GROUP BY status").all() as any[];
  const bySeverity = db.prepare(`
    SELECT ru.severity s, re.status st, COUNT(*) c
    FROM results re JOIN rules ru ON re.ruleId = ru.id
    GROUP BY ru.severity, re.status
  `).all() as any[];
  res.json({ ok: true, counts, bySeverity });
});

function safe(s: string | null) { try { return s ? JSON.parse(s) : null; } catch { return null; } }


