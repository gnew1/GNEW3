
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS disputes(
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  partnerId TEXT NOT NULL,
  currency TEXT NOT NULL,
  amountMinor INTEGER NOT NULL,
  reason TEXT NOT NULL,         -- 'fraud'|'not_received'|'not_as_described'|'duplicate'|...
  scheme TEXT NOT NULL,         -- 'card'|'bank'|'wallet'
  state TEXT NOT NULL,          -- 'open'|'submitted'|'won'|'lost'|'partial'|'canceled'
  riskScore INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  evidenceDueAt INTEGER NOT NULL,
  arbitrationDueAt INTEGER NOT NULL,
  closedAt INTEGER
);

CREATE TABLE IF NOT EXISTS evidence(
  id TEXT PRIMARY KEY,
  disputeId TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'receipt'|'tracking'|'kyc'|'chat'|'custom'
  content TEXT NOT NULL,        -- JSON/Text/Base64
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dispute_events(
  id TEXT PRIMARY KEY,
  disputeId TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS holds(
  id TEXT PRIMARY KEY,
  disputeId TEXT NOT NULL,
  partnerId TEXT NOT NULL,
  currency TEXT NOT NULL,
  amountMinor INTEGER NOT NULL,  -- bloqueado (positivo)
  state TEXT NOT NULL,           -- 'active'|'released'|'applied'
  createdAt INTEGER NOT NULL,
  releasedAt INTEGER,
  appliedAt INTEGER
);

CREATE TABLE IF NOT EXISTS adjustments(
  id TEXT PRIMARY KEY,
  disputeId TEXT NOT NULL,
  partnerId TEXT NOT NULL,
  currency TEXT NOT NULL,
  amountMinor INTEGER NOT NULL,  -- signo: negativo = cargo al partner, positivo = abono
  reason TEXT NOT NULL,          -- 'chargeback'|'fee'|'reversal'|'partial'
  createdAt INTEGER NOT NULL,
  exportedAt INTEGER
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


