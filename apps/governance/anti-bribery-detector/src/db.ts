
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS entities(
  address TEXT PRIMARY KEY,
  createdTs INTEGER,  -- primera aparición observada
  lastTs INTEGER,     -- última aparición observada
  isContract INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS votes(
  id TEXT PRIMARY KEY,
  proposalId TEXT NOT NULL,
  voter TEXT NOT NULL,
  choice TEXT,
  txHash TEXT,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_votes_prop ON votes(proposalId);
CREATE INDEX IF NOT EXISTS ix_votes_voter ON votes(voter);

CREATE TABLE IF NOT EXISTS transfers(
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  token TEXT NOT NULL,           -- ETH o dirección ERC-20
  fromAddr TEXT NOT NULL,
  toAddr TEXT NOT NULL,
  value TEXT NOT NULL            -- string decimal base units
);
CREATE INDEX IF NOT EXISTS ix_transfers_to ON transfers(toAddr, ts);
CREATE INDEX IF NOT EXISTS ix_transfers_from ON transfers(fromAddr, ts);
CREATE INDEX IF NOT EXISTS ix_transfers_ts ON transfers(ts);

CREATE TABLE IF NOT EXISTS edges( -- agregados del grafo por pareja
  fromAddr TEXT NOT NULL,
  toAddr TEXT NOT NULL,
  cnt INTEGER NOT NULL,
  sumVal REAL NOT NULL,
  lastTs INTEGER NOT NULL,
  PRIMARY KEY(fromAddr, toAddr)
);

CREATE TABLE IF NOT EXISTS alerts(
  id TEXT PRIMARY KEY,
  proposalId TEXT NOT NULL,
  voter TEXT NOT NULL,
  score REAL NOT NULL,
  reason TEXT NOT NULL,     -- JSON con desglose de pesos y evidencias
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_alerts_prop ON alerts(proposalId);
`);

export function touchEntity(addr: string, ts: number) {
  db.prepare(`
    INSERT INTO entities(address, createdTs, lastTs, isContract) VALUES(?, ?, ?, 0)
    ON CONFLICT(address) DO UPDATE SET lastTs=MAX(entities.lastTs, excluded.lastTs)
  `).run(addr.toLowerCase(), ts, ts);
}


