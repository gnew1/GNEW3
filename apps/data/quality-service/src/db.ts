
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS dq_rules(
  id TEXT PRIMARY KEY,
  datasetKey TEXT NOT NULL,
  column TEXT,
  type TEXT NOT NULL,           -- not_null|unique|min_value|max_value|between|regex|allowed_set|max_null_ratio|min_distinct|max_distinct|foreign_key
  params TEXT NOT NULL,         -- JSON con parámetros específicos
  severity TEXT NOT NULL,       -- warn|error
  active INTEGER NOT NULL DEFAULT 1,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_rules_ds ON dq_rules(datasetKey, active);

CREATE TABLE IF NOT EXISTS dq_profiles(
  id TEXT PRIMARY KEY,
  datasetKey TEXT NOT NULL,
  ts INTEGER NOT NULL,
  rowCount INTEGER NOT NULL,
  metrics TEXT NOT NULL         -- JSON: { [colName]: { nulls, distinct, min, max, mean, stddev } }
);
CREATE INDEX IF NOT EXISTS ix_profiles_ds_ts ON dq_profiles(datasetKey, ts);

CREATE TABLE IF NOT EXISTS dq_runs(
  runId TEXT PRIMARY KEY,
  datasetKey TEXT NOT NULL,
  ts INTEGER NOT NULL,
  status TEXT NOT NULL,         -- passed|warn|failed
  score REAL NOT NULL,
  result TEXT NOT NULL          -- JSON resumen
);

CREATE TABLE IF NOT EXISTS dq_results(
  id TEXT PRIMARY KEY,
  runId TEXT NOT NULL,
  ruleId TEXT NOT NULL,
  passed INTEGER NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  severity TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_results_run ON dq_results(runId);

CREATE TABLE IF NOT EXISTS dq_metrics_ts(
  id TEXT PRIMARY KEY,
  datasetKey TEXT NOT NULL,
  metric TEXT NOT NULL,         -- rowCount|null_ratio:<col>|distinct_ratio:<col>|mean:<col>|...
  ts INTEGER NOT NULL,
  value REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_ts_ds_metric ON dq_metrics_ts(datasetKey, metric, ts);

CREATE TABLE IF NOT EXISTS audit(
  id TEXT PRIMARY KEY,
  scopeId TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts INTEGER NOT NULL,
  prevHashHex TEXT NOT NULL,
  hashHex TEXT NOT NULL
);
`);


