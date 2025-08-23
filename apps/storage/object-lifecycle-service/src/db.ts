
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS policies(
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  prefix TEXT,                  -- null = todo el bucket
  minRetentionDays INTEGER NOT NULL CHECK (minRetentionDays >= 0),
  mode TEXT NOT NULL,           -- governance|compliance (informativo para S3)
  preventOverwrite INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_policies_bucket ON policies(bucket);
CREATE INDEX IF NOT EXISTS ix_policies_bucket_prefix ON policies(bucket, prefix);

CREATE TABLE IF NOT EXISTS legal_holds(
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  reason TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_hold ON legal_holds(bucket, key);

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


