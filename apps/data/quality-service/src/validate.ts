
import { z } from "zod";
import { evaluateRules } from "./rules.js";
import { Profile } from "./types.js";
import { db } from "./db.js";
import { nanoid } from "nanoid";
import { writeAudit } from "./audit.js";

const ProfileSchema = z.object({
  rowCount: z.number().int().nonnegative(),
  columns: z.array(z.object({
    name: z.string().min(1),
    nulls: z.number().int().nonnegative().optional(),
    distinct: z.number().int().nonnegative().optional(),
    min: z.any().optional(),
    max: z.any().optional(),
    mean: z.number().optional().nullable(),
    stddev: z.number().optional().nullable()
  }))
});

const ValidateReq = z.object({
  runId: z.string().min(3).default(() => nanoid()),
  datasetKey: z.string().min(3),
  profile: ProfileSchema,
  at: z.number().int().optional(),
  linkRun: z.string().optional(), // runId de lineage
  context: z.record(z.any()).optional()
});

export function validate(input: unknown) {
  const p = ValidateReq.parse(input);
  const ts = p.at ?? Date.now();
  const prof = p.profile as Profile;

  // Guardar perfil
  const metrics: Record<string, any> = {};
  for (const c of prof.columns) {
    metrics[c.name] = { nulls: c.nulls ?? 0, distinct: c.distinct ?? 0, min: c.min ?? null, max: c.max ?? null, mean: c.mean ?? null, stddev: c.stddev ?? null };
  }
  db.prepare("INSERT INTO dq_profiles(id,datasetKey,ts,rowCount,metrics) VALUES(?,?,?,?,?)")
    .run(nanoid(), p.datasetKey, ts, prof.rowCount, JSON.stringify(metrics));

  // Evaluar reglas
  const res = evaluateRules(p.datasetKey, prof);
  const total = res.length || 1;
  const errors = res.filter(r => !r.passed && r.severity === "error").length;
  const warns  = res.filter(r => !r.passed && r.severity === "warn").length;
  const status = errors > 0 ? "failed" : warns > 0 ? "warn" : "passed";
  const score  = Math.max(0, (total - errors - 0.5 * warns) / total);

  // Persistir run y resultados
  db.prepare("INSERT INTO dq_runs(runId,datasetKey,ts,status,score,result) VALUES(?,?,?,?,?,?)")
    .run(p.runId, p.datasetKey, ts, status, score, JSON.stringify({ errors, warns, total, linkRun: p.linkRun ?? null }));

  const stmt = db.prepare("INSERT INTO dq_results(id,runId,ruleId,passed,message,details,severity) VALUES(?,?,?,?,?,?,?)");
  for (const r of res) {
    stmt.run(nanoid(), p.runId, r.ruleId, r.passed ? 1 : 0, r.message, JSON.stringify(r.details ?? {}), r.severity);
  }

  // Series temporales básicas
  ingestTimeSeriesFromProfile(p.datasetKey, ts, prof);

  writeAudit(p.runId, "VALIDATE", { datasetKey: p.datasetKey, status, score, errors, warns });
  return { runId: p.runId, status, score, summary: { total, warns, errors }, results: res };
}

export function ingestTimeSeriesFromProfile(datasetKey: string, ts: number, prof: Profile) {
  const insert = db.prepare("INSERT INTO dq_metrics_ts(id,datasetKey,metric,ts,value) VALUES(?,?,?,?,?)");
  insert.run(nanoid(), datasetKey, "rowCount", ts, prof.rowCount);
  for (const c of prof.columns) {
    const rc = prof.rowCount || 1;
    const nullRatio = (c.nulls ?? 0) / rc;
    const distinctRatio = (c.distinct ?? 0) / rc;
    insert.run(nanoid(), datasetKey, `null_ratio:${c.name}`, ts, nullRatio);
    insert.run(nanoid(), datasetKey, `distinct_ratio:${c.name}`, ts, Math.min(1, distinctRatio));
    if (typeof c.mean === "number") insert.run(nanoid(), datasetKey, `mean:${c.name}`, ts, c.mean);
    if (typeof c.stddev === "number") insert.run(nanoid(), datasetKey, `stddev:${c.name}`, ts, c.stddev);
  }
}


