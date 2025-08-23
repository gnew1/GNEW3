
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS documents(
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,          -- 'contract' | 'policy' | ...
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS versions(
  id TEXT PRIMARY KEY,
  docId TEXT NOT NULL,
  version INTEGER NOT NULL,
  mime TEXT,
  size INTEGER NOT NULL,
  sha256Hex TEXT NOT NULL,
  content TEXT NOT NULL,       -- guardado como base64 para binarios
  createdAt INTEGER NOT NULL,
  onchainNetwork TEXT,
  onchainTxHash TEXT,
  onchainRegistered INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_doc_ver ON versions(docId, version);

CREATE TABLE IF NOT EXISTS signatures(
  id TEXT PRIMARY KEY,
  versionId TEXT NOT NULL,
  scheme TEXT NOT NULL,        -- ed25519 | rsa-pss-sha256 | ecdsa-p256-sha256 | ecdsa-secp256k1-sha256
  over TEXT NOT NULL,          -- 'content' | 'hash'
  hashAlgo TEXT,
  signer TEXT,                 -- opcional: email/DID
  signatureBase64 TEXT NOT NULL,
  valid INTEGER NOT NULL,
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


