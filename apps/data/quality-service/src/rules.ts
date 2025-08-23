
import { RuleType, Severity, Profile, ColumnMetric } from "./types.js";
import { db } from "./db.js";
import { nanoid } from "nanoid";

export type Rule = {
  id: string;
  datasetKey: string;
  column?: string | null;
  type: RuleType;
  params: any;
  severity: Severity;
  active: number;
  updatedAt: number;
};

export function listRules(datasetKey: string): Rule[] {
  return db.prepare("SELECT * FROM dq_rules WHERE datasetKey=? AND active=1 ORDER BY updatedAt DESC")
    .all(datasetKey) as any;
}

export function upsertRule(p: {
  datasetKey: string;
  column?: string;
  type: RuleType;
  params: any;
  severity: Severity;
  active?: boolean;
}) {
  const now = Date.now();
  const existing = db.prepare("SELECT id FROM dq_rules WHERE datasetKey=? AND IFNULL(column,'')=IFNULL(?, '') AND type=?")
    .get(p.datasetKey, p.column ?? null, p.type) as any;
  const id = existing?.id ?? nanoid();
  db.prepare(`
    INSERT INTO dq_rules(id, datasetKey, column, type, params, severity, active, updatedAt)
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET params=excluded.params, severity=excluded.severity, active=excluded.active, updatedAt=excluded.updatedAt
  `).run(id, p.datasetKey, p.column ?? null, p.type, JSON.stringify(p.params ?? {}), p.severity, p.active === false ? 0 : 1, now);
  return id;
}

export function evaluateRules(datasetKey: string, profile: Profile) {
  const rules = listRules(datasetKey);
  const colMap = new Map<string, ColumnMetric>();
  for (const c of profile.columns) colMap.set(c.name, c);

  const results: Array<{ ruleId: string; passed: boolean; severity: Severity; message: string; details?: any }> = [];

  for (const r of rules) {
    const c = r.column ? colMap.get(r.column) : undefined;
    const rowCount = profile.rowCount;
    const p = r.params || {};
    let passed = true;
    let msg = "ok";
    let details: any = {};

    switch (r.type) {
      case "not_null": {
        const nulls = c?.nulls ?? 0;
        passed = nulls === 0;
        msg = `not_null(${r.column}) => nulls=${nulls}`;
        details = { nulls };
        break;
      }
      case "unique": {
        const distinct = c?.distinct ?? 0;
        const nulls = c?.nulls ?? 0;
        passed = (distinct + nulls) >= rowCount;
        msg = `unique(${r.column}) => distinct=${distinct}, rowCount=${rowCount}`;
        details = { distinct, rowCount, nulls };
        break;
      }
      case "min_value": {
        const min = num(c?.min);
        const thr = num(p.min);
        passed = min >= thr;
        msg = `min_value(${r.column}) >= ${thr} (min=${min})`;
        details = { min, threshold: thr };
        break;
      }
      case "max_value": {
        const max = num(c?.max);
        const thr = num(p.max);
        passed = max <= thr;
        msg = `max_value(${r.column}) <= ${thr} (max=${max})`;
        details = { max, threshold: thr };
        break;
      }
      case "between": {
        const minv = num(c?.min), maxv = num(c?.max);
        const a = num(p.min), b = num(p.max);
        passed = minv >= a && maxv <= b;
        msg = `between(${r.column}) in [${a},${b}] (min=${minv}, max=${maxv})`;
        details = { min: minv, max: maxv, range: [a, b] };
        break;
      }
      case "regex": {
        const re = new RegExp(String(p.pattern ?? ""), p.flags ?? "");
        // Con perfil no podemos validar regex exacto sin sample; usamos aproximación: si regex es para formato (ej. ^[A-Z0-9-]+$)
        // fallará si distinct < rowCount*expectedCoverage (si se pasa), por defecto no valida estrictamente.
        const coverage = Number.isFinite(+p.minCoverage) ? Number(p.minCoverage) : 0.9;
        const distinct = c?.distinct ?? 0;
        const nulls = c?.nulls ?? 0;
        passed = (distinct + nulls) >= Math.floor(rowCount * coverage);
        msg = `regex(${r.column}) ~ /${re.source}/ (approx by coverage ${coverage})`;
        details = { distinct, rowCount, nulls, coverage };
        break;
      }
      case "allowed_set": {
        // Si tenemos distinct < |set| y rowCount >>, es indicio de desalineación; aprobamos si distinct <= |set|
        const setSize = Array.isArray(p.set) ? p.set.length : 0;
        const distinct = c?.distinct ?? 0;
        passed = distinct <= setSize;
        msg = `allowed_set(${r.column}) size=${setSize}, distinct=${distinct}`;
        details = { setSize, distinct };
        break;
      }
      case "max_null_ratio": {
        const nulls = c?.nulls ?? 0;
        const ratio = rowCount > 0 ? nulls / rowCount : 0;
        const thr = Number(p.max ?? 0);
        passed = ratio <= thr;
        msg = `max_null_ratio(${r.column}) <= ${thr} (ratio=${ratio.toFixed(4)})`;
        details = { nulls, rowCount, ratio, threshold: thr };
        break;
      }
      case "min_distinct": {
        const distinct = c?.distinct ?? 0;
        const thr = Number(p.min ?? 1);
        passed = distinct >= thr;
        msg = `min_distinct(${r.column}) >= ${thr} (distinct=${distinct})`;
        details = { distinct, threshold: thr };
        break;
      }
      case "max_distinct": {
        const distinct = c?.distinct ?? 0;
        const thr = Number(p.max ?? Infinity);
        passed = distinct <= thr;
        msg = `max_distinct(${r.column}) <= ${thr} (distinct=${distinct})`;
        details = { distinct, threshold: thr };
        break;
      }
      case "foreign_key": {
        // Validación aproximada: FK requiere que distinct(child) <= distinct(parent). Se provee `parent` como "ns.name.col"
        const parentDistinct = Number(p.parentDistinct ?? NaN);
        const childDistinct = c?.distinct ?? 0;
        if (!Number.isFinite(parentDistinct)) {
          passed = true; msg = "foreign_key skipped (no parentDistinct provided)";
        } else {
          passed = childDistinct <= parentDistinct;
          msg = `foreign_key(${r.column} -> ${p.parent}) childDistinct=${childDistinct} parentDistinct=${parentDistinct}`;
          details = { childDistinct, parentDistinct, parent: p.parent };
        }
        break;
      }
      default:
        passed = true; msg = "unknown_rule";
    }
    results.push({ ruleId: r.id, passed, severity: r.severity, message: msg, details });
  }

  return results;
}

function num(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  return n;
}


