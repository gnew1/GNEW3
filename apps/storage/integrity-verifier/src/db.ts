
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS verifications(
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  labels TEXT,
  artifactSize INTEGER NOT NULL,
  sha256Hex TEXT NOT NULL,
  sha3_256Hex TEXT NOT NULL,
  ok INTEGER NOT NULL,
  checks TEXT NOT NULL,
  mismatch TEXT NOT NULL
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


