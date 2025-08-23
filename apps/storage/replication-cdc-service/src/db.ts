
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS events(
  id TEXT PRIMARY KEY,
  op TEXT NOT NULL,             -- PUT|DELETE
  key TEXT NOT NULL,
  etag TEXT,                    -- opcional en backfill
  size INTEGER,
  contentType TEXT,
  srcRegion TEXT NOT NULL,      -- 'primary' | 'secondary'
  dstRegion TEXT NOT NULL,      -- 'primary' | 'secondary'
  ts INTEGER NOT NULL,
  status TEXT NOT NULL,         -- pending|in_progress|done|error
  attempts INTEGER NOT NULL DEFAULT 0,
  leaseUntil INTEGER,
  lastError TEXT,
  updatedAt INTEGER NOT NULL,
  targetEtag TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_event_dedupe ON events(key, op, IFNULL(etag,''), srcRegion, dstRegion);
CREATE INDEX IF NOT EXISTS ix_event_status ON events(status, ts);

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


