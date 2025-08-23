
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS disputes(
  id TEXT PRIMARY KEY,
  paymentId TEXT NOT NULL,
  partnerId TEXT,
  currency TEXT NOT NULL,
  amountMinor INTEGER NOT NULL,
  feeMinor INTEGER NOT NULL DEFAULT 0,
  network TEXT,               -- visa|mc|amex|... (opcional)
  reasonCode TEXT NOT NULL,
  status TEXT NOT NULL,       -- inquiry|chargeback|representment|prearbitration|arbitration|accepted|won|lost
  openedAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  respondBy INTEGER NOT NULL, -- deadline epoch ms
  notes TEXT
);

CREATE TABLE IF NOT EXISTS evidence(
  id TEXT PRIMARY KEY,
  disputeId TEXT NOT NULL,
  kind TEXT NOT NULL,         -- receipt|shipping|communication|policy|other
  url TEXT,
  meta TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS holds(
  id TEXT PRIMARY KEY,
  disputeId TEXT NOT NULL,
  partnerId TEXT,
  currency TEXT NOT NULL,
  amountMinor INTEGER NOT NULL, -- monto en disputa
  createdAt INTEGER NOT NULL,
  releasedAt INTEGER
);

CREATE TABLE IF NOT EXISTS adjustments(
  id TEXT PRIMARY KEY,
  disputeId TEXT NOT NULL,
  partnerId TEXT,
  currency TEXT NOT NULL,
  kind TEXT NOT NULL,         -- release|clawback
  amountMinor INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
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


