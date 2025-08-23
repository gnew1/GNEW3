
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS events(
  id TEXT PRIMARY KEY,
  occurredAt INTEGER NOT NULL,
  type TEXT NOT NULL,           -- 'payment_attempt' | 'account_action' ...
  currency TEXT,
  amountMinor INTEGER,
  userId TEXT,
  email TEXT,
  ip TEXT,
  deviceId TEXT,
  cardBin TEXT,
  cardCountry TEXT,
  billingCountry TEXT,
  shippingCountry TEXT,
  billingLat REAL, billingLon REAL,
  shippingLat REAL, shippingLon REAL,
  userAgent TEXT,
  payload TEXT NOT NULL,        -- raw event
  features TEXT NOT NULL,       -- computed features
  score REAL NOT NULL,
  decision TEXT NOT NULL,       -- allow|review|block
  reasons TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS labels(
  id TEXT PRIMARY KEY,
  eventId TEXT NOT NULL,
  label TEXT NOT NULL,          -- legit|fraud
  source TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS counters(
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lists(
  id TEXT PRIMARY KEY,
  list TEXT NOT NULL,           -- deny|allow
  kind TEXT NOT NULL,           -- ip|email|bin|device
  value TEXT NOT NULL,
  note TEXT,
  updatedAt INTEGER NOT NULL,
  UNIQUE(list, kind, value)
);

CREATE TABLE IF NOT EXISTS policy(
  id INTEGER PRIMARY KEY CHECK (id=1),
  allowThreshold REAL NOT NULL,
  reviewThreshold REAL NOT NULL, -- >= allowThreshold
  hardBlockGeoDistanceKm REAL NOT NULL,
  hardBlockVelocityIp INTEGER NOT NULL,
  hardBlockVelocityDevice INTEGER NOT NULL
);
INSERT OR IGNORE INTO policy(id,allowThreshold,reviewThreshold,hardBlockGeoDistanceKm,hardBlockVelocityIp,hardBlockVelocityDevice)
VALUES(1, 0.20, 0.60, 5000.0, 50, 100);

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


