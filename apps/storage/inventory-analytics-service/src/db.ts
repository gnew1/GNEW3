
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS inventory_runs(
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_runs_bucket ON inventory_runs(bucket);

CREATE TABLE IF NOT EXISTS objects(
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  size INTEGER NOT NULL,
  storageClass TEXT NOT NULL,
  lastModified INTEGER NOT NULL,
  etag TEXT,
  runId TEXT NOT NULL,
  PRIMARY KEY(bucket, key)
);
CREATE INDEX IF NOT EXISTS ix_objects_bucket_prefix ON objects(bucket, key);

CREATE TABLE IF NOT EXISTS plans(
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  prefix TEXT,
  dryRun INTEGER NOT NULL,
  total INTEGER NOT NULL,
  estSavingsUSD REAL NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS plan_items(
  id TEXT PRIMARY KEY,
  planId TEXT NOT NULL,
  key TEXT NOT NULL,
  size INTEGER NOT NULL,
  fromClass TEXT NOT NULL,
  action TEXT NOT NULL,       -- transition|expire
  toClass TEXT,
  reason TEXT,
  estSavingsUSD REAL NOT NULL
);

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


