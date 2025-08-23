
import Database from "better-sqlite3";
export const db = new Database(process.env.DATABASE_URL ?? "data/subscriptions.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS plans(
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  amount INTEGER NOT NULL,
  periodSeconds INTEGER NOT NULL,
  anchorTimestamp INTEGER NOT NULL,
  graceSeconds INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS subscriptions(
  id TEXT PRIMARY KEY,
  planId TEXT NOT NULL,
  subscriber TEXT NOT NULL,
  prorateFirst INTEGER NOT NULL,
  status TEXT NOT NULL,
  startAt INTEGER NOT NULL,
  nextChargeAt INTEGER NOT NULL,
  graceEndsAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit(
  id TEXT PRIMARY KEY,
  scopeId TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts INTEGER NOT NULL
);
`);


