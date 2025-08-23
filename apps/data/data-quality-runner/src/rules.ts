
import { z } from "zod";
import { db } from "./db.js";
import { nanoid } from "nanoid";

export const RuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3),
  db: z.string().optional(),
  table: z.string().optional(),
  location: z.string().url().optional(), // s3://bucket/prefix
  kind: z.enum(["freshness","min_files","min_total_size","file_format","schema_match","partition_presence"]),
  severity: z.enum(["low","medium","high"]).default("medium"),
  params: z.record(z.any()).default({})
});
export type Rule = z.infer<typeof RuleSchema>;

export function upsertRule(p: Rule) {
  const id = p.id ?? nanoid();
  const now = Date.now();
  db.prepare(`
    INSERT INTO rules(id, name, dbName, tableName, location, kind, severity, params, createdAt, updatedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, dbName=excluded.dbName, tableName=excluded.tableName,
      location=excluded.location, kind=excluded.kind, severity=excluded.severity, params=excluded.params, updatedAt=excluded.updatedAt
  `).run(id, p.name, p.db ?? null, p.table ?? null, p.location ?? null, p.kind, p.severity, JSON.stringify(p.params ?? {}), now, now);
  return id;
}

export function listRules(dbName?: string, tableName?: string) {
  if (dbName && tableName) {
    return db.prepare("SELECT * FROM rules WHERE dbName=? AND tableName=? ORDER BY updatedAt DESC").all(dbName, tableName) as any[];
  }
  return db.prepare("SELECT * FROM rules ORDER BY updatedAt DESC").all() as any[];
}

export function removeRule(id: string) {
  db.prepare("DELETE FROM rules WHERE id=?").run(id);
}

export type EvalResult = { status: "pass"|"warn"|"fail"|"error"; detail: any };

export function evaluateToStatus(ok: boolean, severity: "low"|"medium"|"high"): "pass"|"warn"|"fail" {
  if (ok) return "pass";
  return severity === "low" ? "warn" : "fail";
}


