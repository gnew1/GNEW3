
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS datasets(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dbName TEXT,
  tableName TEXT,
  location TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  startedAt INTEGER NOT NULL,
  finishedAt INTEGER
);

CREATE TABLE IF NOT EXISTS lineage_edges(
  id TEXT PRIMARY KEY,
  sourceDatasetId TEXT NOT NULL,
  targetDatasetId TEXT NOT NULL,
  jobId TEXT NOT NULL,
  transform TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quality_refs(
  id TEXT PRIMARY KEY,
  datasetId TEXT NOT NULL,
  ruleId TEXT NOT NULL,
  runId TEXT NOT NULL,
  status TEXT,
  createdAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_edges_source ON lineage_edges(sourceDatasetId);
CREATE INDEX IF NOT EXISTS ix_edges_target ON lineage_edges(targetDatasetId);
`);


