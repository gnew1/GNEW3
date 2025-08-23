
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS datasets(
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,     -- "namespace.name"
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dataset_versions(
  id TEXT PRIMARY KEY,
  datasetId TEXT NOT NULL,
  version INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dataset_version ON dataset_versions(datasetId, version);

CREATE TABLE IF NOT EXISTS columns(
  id TEXT PRIMARY KEY,
  datasetId TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  nullable INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_cols_by_ds_ver ON columns(datasetId, version);

CREATE TABLE IF NOT EXISTS jobs(
  runId TEXT PRIMARY KEY,
  jobName TEXT NOT NULL,
  pipeline TEXT,
  producer TEXT,
  startedAt INTEGER NOT NULL,
  endedAt INTEGER,
  status TEXT NOT NULL          -- running|completed|failed
);

-- edges de lineage:
--  READ : job -> dataset (lee)
--  WRITE: job -> dataset (escribe)
--  DERIVE: (src dataset.column) -> (dst dataset.column) via job
CREATE TABLE IF NOT EXISTS edges(
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,           -- READ|WRITE|DERIVE
  srcDatasetId TEXT,
  srcColumn TEXT,
  dstDatasetId TEXT,
  dstColumn TEXT,
  runId TEXT,
  transform TEXT,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_edges_dst ON edges(dstDatasetId);
CREATE INDEX IF NOT EXISTS ix_edges_src ON edges(srcDatasetId);

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


