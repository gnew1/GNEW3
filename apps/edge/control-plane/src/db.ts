
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS keys(
  kid TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  secretB64Url TEXT NOT NULL,
  status TEXT NOT NULL,     -- active|inactive
  createdAt INTEGER NOT NULL,
  rotatedAt INTEGER,
  expiresAt INTEGER
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

CREATE TABLE IF NOT EXISTS sign_events(
  id TEXT PRIMARY KEY,
  kid TEXT NOT NULL,
  method TEXT NOT NULL,
  inputUrl TEXT NOT NULL,
  signedUrl TEXT NOT NULL,
  ts INTEGER NOT NULL
);
`);


