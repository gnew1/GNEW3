
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS wallets(
  address TEXT PRIMARY KEY,
  chainId INTEGER,
  firstSeenAt INTEGER NOT NULL,
  lastSeenAt INTEGER NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  decision TEXT NOT NULL DEFAULT 'allow',
  reasons TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS wallet_events(
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  kind TEXT NOT NULL,            -- 'tx' | 'alert' | 'label' | 'assessment'
  payload TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_events_addr_ts ON wallet_events(address, ts DESC);

CREATE TABLE IF NOT EXISTS lists(
  id TEXT PRIMARY KEY,
  list TEXT NOT NULL,            -- 'deny' | 'allow' | 'sanctions'
  address TEXT NOT NULL,
  note TEXT,
  updatedAt INTEGER NOT NULL,
  UNIQUE(list, address)
);

CREATE TABLE IF NOT EXISTS counterparts(
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,         -- wallet auditada
  counterparty TEXT NOT NULL,    -- contraparte afectada
  risk INTEGER NOT NULL,         -- 0..100
  lastSeenAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_cp_addr ON counterparts(address);

CREATE TABLE IF NOT EXISTS revocations(
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  reason TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER
);

CREATE TABLE IF NOT EXISTS policy(
  id INTEGER PRIMARY KEY CHECK (id=1),
  warnThreshold REAL NOT NULL,
  blockThreshold REAL NOT NULL
);
INSERT OR IGNORE INTO policy(id,warnThreshold,blockThreshold) VALUES(1, 0.30, 0.70);

CREATE TABLE IF NOT EXISTS counters(
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
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


