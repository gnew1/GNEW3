
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS partners(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  defaultFeePct INTEGER NOT NULL DEFAULT 0,   -- ppm (parts per million). 25000 => 2.5%
  withholdingPct INTEGER NOT NULL DEFAULT 0, -- ppm
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fee_rules(
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,    -- 'global' | 'partner' | 'category'
  partnerId TEXT,
  category TEXT,
  currency TEXT NOT NULL, -- 'EUR','USD',...
  feePct INTEGER NOT NULL,  -- ppm
  minFee INTEGER NOT NULL,  -- minor units (e.g., cents)
  capFee INTEGER NOT NULL,  -- minor units
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders(
  id TEXT PRIMARY KEY,
  partnerId TEXT NOT NULL,
  externalId TEXT NOT NULL,
  currency TEXT NOT NULL,
  grossMinor INTEGER NOT NULL,
  taxMinor INTEGER NOT NULL,
  netMinor INTEGER NOT NULL,
  category TEXT,
  createdAt INTEGER NOT NULL,
  UNIQUE(partnerId, externalId)
);

CREATE TABLE IF NOT EXISTS splits(
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  currency TEXT NOT NULL,
  platformFeeMinor INTEGER NOT NULL,
  partnerGrossMinor INTEGER NOT NULL,
  withholdingMinor INTEGER NOT NULL,
  partnerNetMinor INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS balances(
  partnerId TEXT NOT NULL,
  currency TEXT NOT NULL,
  availableMinor INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  PRIMARY KEY (partnerId, currency)
);

CREATE TABLE IF NOT EXISTS payouts(
  id TEXT PRIMARY KEY,
  partnerId TEXT NOT NULL,
  currency TEXT NOT NULL,
  amountMinor INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  coveredUntil INTEGER NOT NULL, -- inclusive
  status TEXT NOT NULL,          -- 'pending'|'paid'|'canceled'
  reference TEXT
);

CREATE TABLE IF NOT EXISTS payout_items(
  id TEXT PRIMARY KEY,
  payoutId TEXT NOT NULL,
  orderId TEXT NOT NULL,
  amountMinor INTEGER NOT NULL
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


