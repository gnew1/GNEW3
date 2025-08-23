
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS sources(
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,           -- glue|hive|import
  label TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS runs(
  id TEXT PRIMARY KEY,
  sourceId TEXT NOT NULL,
  startedAt INTEGER NOT NULL,
  finishedAt INTEGER,
  ok INTEGER DEFAULT 0,
  stats TEXT
);

CREATE TABLE IF NOT EXISTS databases(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  locationUri TEXT,
  parameters TEXT,
  source TEXT NOT NULL,         -- glue|hive|import
  runId TEXT NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_db_name ON databases(name);

CREATE TABLE IF NOT EXISTS tables(
  id TEXT PRIMARY KEY,
  dbName TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  format TEXT,
  serde TEXT,
  inputFormat TEXT,
  outputFormat TEXT,
  parameters TEXT,
  partitionKeys TEXT,           -- JSON string[]
  source TEXT NOT NULL,
  runId TEXT NOT NULL,
  updatedAt INTEGER NOT NULL,
  UNIQUE(dbName, name)
);

CREATE TABLE IF NOT EXISTS columns(
  id TEXT PRIMARY KEY,
  dbName TEXT NOT NULL,
  tableName TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  comment TEXT,
  position INTEGER NOT NULL,
  source TEXT NOT NULL,
  runId TEXT NOT NULL,
  UNIQUE(dbName, tableName, name)
);

CREATE TABLE IF NOT EXISTS partitions(
  id TEXT PRIMARY KEY,
  dbName TEXT NOT NULL,
  tableName TEXT NOT NULL,
  spec TEXT NOT NULL,           -- JSON (kv)
  location TEXT,
  parameters TEXT,
  source TEXT NOT NULL,
  runId TEXT NOT NULL,
  UNIQUE(dbName, tableName, spec)
);

CREATE VIRTUAL TABLE IF NOT EXISTS search_idx USING fts5(
  kind,                         -- db|table|column
  dbName, tableName, name, description, location, columns, content=''
);
`);


