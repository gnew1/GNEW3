
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS guardians(
  id TEXT PRIMARY KEY,
  walletId TEXT NOT NULL,
  label TEXT NOT NULL,
  pubkeyEd25519 TEXT NOT NULL,
  contactEmail TEXT,
  contactPhone TEXT,
  contactWebhook TEXT,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  active INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS recovery_sessions(
  id TEXT PRIMARY KEY,
  walletId TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  total INTEGER NOT NULL,
  disputeWindowMs INTEGER NOT NULL,
  startedAt INTEGER NOT NULL,
  completeAfter INTEGER NOT NULL,
  canceledAt INTEGER,
  completedAt INTEGER,
  evidence TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS approvals(
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  guardianId TEXT NOT NULL,
  signatureB64 TEXT NOT NULL,
  shareCipherB64 TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  UNIQUE(sessionId, guardianId)
);
CREATE TABLE IF NOT EXISTS audit(
  id TEXT PRIMARY KEY,
  walletId TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts INTEGER NOT NULL,
  prevHashHex TEXT NOT NULL,
  hashHex TEXT NOT NULL
);
`);


