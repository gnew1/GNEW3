
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS objects(
  key TEXT PRIMARY KEY,
  etag TEXT,
  size INTEGER,
  contentType TEXT,
  lastRegion TEXT,      -- primary|secondary
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS replication(
  key TEXT PRIMARY KEY,
  primaryEtag TEXT,
  secondaryEtag TEXT,
  status TEXT NOT NULL,   -- none|pending|ok|error
  lastError TEXT,
  updatedAt INTEGER NOT NULL
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


