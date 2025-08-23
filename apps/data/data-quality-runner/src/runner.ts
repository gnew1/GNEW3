
import { db } from "./db.js";
import { nanoid } from "nanoid";
import { loadTable } from "./catalog.js";
import { statPrefix } from "./s3probe.js";
import { evaluateToStatus } from "./rules.js";

type RuleRow = { id: string; name: string; dbName: string | null; tableName: string | null; location: string | null; kind: string; severity: "low"|"medium"|"high"; params: string };

export async function executeRulesForTable(dbName: string, tableName: string) {
  const runId = beginRun(dbName, tableName);
  try {
    const rules: RuleRow[] = db.prepare("SELECT * FROM rules WHERE dbName=? AND tableName=?").all(dbName, tableName) as any[];
    const table = loadTable(dbName, tableName);
    for (const r of rules) {
      const res = await execRule(r, table?.location ?? r.location ?? null, table);
      saveResult(runId, r.id, res.status, res.detail);
    }
    endRun(runId, true);
    return { runId, executed: rules.length };
  } catch (e: any) {
    endRun(runId, false);
    return { runId, error: String(e?.message ?? e) };
  }
}

export async function executeRuleById(ruleId: string) {
  const r = db.prepare("SELECT * FROM rules WHERE id=?").get(ruleId) as RuleRow | undefined;
  if (!r) throw new Error("rule_not_found");
  const dbName = r.dbName ?? null;
  const tableName = r.tableName ?? null;
  const runId = beginRun(dbName ?? undefined, tableName ?? undefined);
  try {
    const table = dbName && tableName ? loadTable(dbName, tableName) : null;
    const res = await execRule(r, table?.location ?? r.location ?? null, table);
    saveResult(runId, r.id, res.status, res.detail);
    endRun(runId, true);
    return { runId, executed: 1 };
  } catch (e: any) {
    endRun(runId, false);
    return { runId, error: String(e?.message ?? e) };
  }
}

async function execRule(r: RuleRow, location: string | null, table: ReturnType<typeof loadTable> | null): Promise<{ status: any; detail: any }> {
  const params = safeJson(r.params);
  switch (r.kind) {
    case "freshness": {
      if (!location) throw new Error("missing_location");
      const stats = await statPrefix(location);
      const maxDelayMin = Number(params.maxDelayMinutes ?? 60);
      const now = Date.now();
      const ageMin = stats.maxLastModified == null ? Infinity : (now - stats.maxLastModified) / 60000;
      const ok = ageMin <= maxDelayMin;
      return { status: evaluateToStatus(ok, r.severity), detail: { kind: "freshness", location, maxDelayMinutes: maxDelayMin, ageMinutes: ageMin, maxLastModified: stats.maxLastModified } };
    }
    case "min_files": {
      if (!location) throw new Error("missing_location");
      const stats = await statPrefix(location);
      const min = Number(params.min ?? 1);
      const ok = stats.count >= min;
      return { status: evaluateToStatus(ok, r.severity), detail: { kind: "min_files", location, files: stats.count, min } };
    }
    case "min_total_size": {
      if (!location) throw new Error("missing_location");
      const stats = await statPrefix(location);
      const minBytes = Number(params.minBytes ?? 1);
      const ok = stats.bytes >= minBytes;
      return { status: evaluateToStatus(ok, r.severity), detail: { kind: "min_total_size", location, bytes: stats.bytes, minBytes } };
    }
    case "file_format": {
      // compara con formato del catálogo
      const expected = String(params.expected ?? (table?.format ?? "")).toLowerCase();
      const actual = String(table?.format ?? "").toLowerCase();
      const ok = expected ? (expected === actual) : Boolean(actual);
      return { status: evaluateToStatus(ok, r.severity), detail: { kind: "file_format", expected, actual } };
    }
    case "schema_match": {
      const expected: string[] = Array.isArray(params.expectedColumns) ? params.expectedColumns : (table?.columns?.map(c => c.name) ?? []);
      const actual: string[] = table?.columns?.map(c => c.name) ?? [];
      const missing = expected.filter(c => !actual.includes(c));
      const ok = missing.length === 0;
      return { status: evaluateToStatus(ok, r.severity), detail: { kind: "schema_match", expectedCount: expected.length, actualCount: actual.length, missing } };
    }
    case "partition_presence": {
      // Heurística: revisa si existe prefijo para fecha actual/ayer bajo location
      if (!location) throw new Error("missing_location");
      const fmt: "YYYY-MM-DD" | "YYYY/MM/DD" = params.format ?? "YYYY-MM-DD";
      const daysBack: number = Number(params.daysBack ?? 1);
      const base = new Date();
      const targets: string[] = [];
      for (let i = 0; i <= daysBack; i++) {
        const d = new Date(base.getTime() - i * 86400000);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const seg = fmt === "YYYY/MM/DD" ? `${yyyy}/${mm}/${dd}` : `${yyyy}-${mm}-${dd}`;
        targets.push(seg);
      }
      // comprueba si algún target aparece en el prefix
      const stats = await statPrefix(location);
      // Para eficiencia se puede mejorar con ListObjects por prefijo/target; aquí devolvemos señal básica.
      const ok = stats.count > 0; // señal mínima; implementar scan segmentada por target en evolución
      return { status: evaluateToStatus(ok, r.severity), detail: { kind: "partition_presence", format: fmt, daysBack, checked: targets, note: "implementación básica (optimizable por prefijo exacto)" } };
    }
    default:
      throw new Error(`unknown_rule_kind:${r.kind}`);
  }
}

// --------- persistence helpers ----------
function beginRun(dbName?: string, tableName?: string) {
  const runId = nanoid();
  db.prepare("INSERT INTO runs(id, startedAt, dbName, tableName, ok) VALUES(?,?,?,?,0)").run(runId, Date.now(), dbName ?? null, tableName ?? null);
  return runId;
}
function endRun(runId: string, ok: boolean) {
  db.prepare("UPDATE runs SET finishedAt=?, ok=? WHERE id=?").run(Date.now(), ok ? 1 : 0, runId);
}
function saveResult(runId: string, ruleId: string, status: string, detail: any) {
  db.prepare("INSERT INTO results(id, runId, ruleId, status, detail, createdAt) VALUES(?,?,?,?,?,?)")
    .run(nanoid(), runId, ruleId, status, JSON.stringify(detail ?? {}), Date.now());
}

function safeJson(v: string | null): any {
  try { return v ? JSON.parse(v) : {}; } catch { return {}; }
}


