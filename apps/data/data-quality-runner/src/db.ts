
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS rules(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dbName TEXT,                  -- opcional si se usa location
  tableName TEXT,
  location TEXT,                -- s3://bucket/prefix (si no hay catalog)
  kind TEXT NOT NULL,           -- freshness|min_files|min_total_size|file_format|schema_match|partition_presence
  severity TEXT NOT NULL,       -- low|medium|high
  params TEXT NOT NULL,         -- JSON
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_rules_table ON rules(dbName, tableName);

CREATE TABLE IF NOT EXISTS runs(
  id TEXT PRIMARY KEY,
  startedAt INTEGER NOT NULL,
  finishedAt INTEGER,
  dbName TEXT,
  tableName TEXT,
  ok INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS results(
  id TEXT PRIMARY KEY,
  runId TEXT NOT NULL,
  ruleId TEXT NOT NULL,
  status TEXT NOT NULL,         -- pass|warn|fail|error
  detail TEXT,                  -- JSON con métricas y explicación
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_results_run ON results(runId);

CREATE VIEW IF NOT EXISTS v_latest_report AS
SELECT r.dbName, r.tableName, MAX(r.startedAt) AS lastRunTs
FROM runs r
GROUP BY r.dbName, r.tableName;
`);


