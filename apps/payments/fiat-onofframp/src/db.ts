
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS orders(
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  side TEXT NOT NULL,
  fiat TEXT NOT NULL,
  crypto TEXT NOT NULL,
  amountFiat REAL NOT NULL,
  walletAddress TEXT NOT NULL,
  status TEXT NOT NULL,
  kycStatus TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  providerRef TEXT,
  idempotencyKey TEXT NOT NULL,
  UNIQUE(idempotencyKey)
);

CREATE TABLE IF NOT EXISTS kyc(
  walletId TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  evidence TEXT NOT NULL,
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


