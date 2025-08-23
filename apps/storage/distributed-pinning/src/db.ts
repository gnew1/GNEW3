
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS objects(
  cid TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL,
  size INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS replications(
  id TEXT PRIMARY KEY,
  cid TEXT NOT NULL,
  backend TEXT NOT NULL,     -- 'ipfs' | 'web3storage' | 'bundlr'
  status TEXT NOT NULL,      -- 'pending' | 'ok' | 'error'
  remoteId TEXT,
  error TEXT,
  updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_rep_bycid ON replications(cid);

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


