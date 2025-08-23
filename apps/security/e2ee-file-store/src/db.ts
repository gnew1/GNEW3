
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS objects(
  id TEXT PRIMARY KEY,
  ownerId TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT,
  labels TEXT,           -- json
  policyId TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS envelopes(
  objectId TEXT PRIMARY KEY,
  algo TEXT NOT NULL,        -- aes-256-gcm
  ivHex TEXT NOT NULL,
  tagHex TEXT NOT NULL,
  wrappedDEKBase64 TEXT NOT NULL,
  kmsProvider TEXT NOT NULL, -- local|aws|vault
  kmsKeyVersion INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS policies(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version INTEGER NOT NULL,
  body TEXT NOT NULL,        -- json
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS kms_keys(
  id TEXT PRIMARY KEY,       -- provider:version (e.g., local:1)
  provider TEXT NOT NULL,    -- local|aws|vault
  version INTEGER NOT NULL,
  publicPem TEXT,
  privatePemEnc TEXT,        -- local-only; demo encryption at rest
  status TEXT NOT NULL,      -- active|retired
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tokens(
  id TEXT PRIMARY KEY,
  objectId TEXT NOT NULL,
  sub TEXT NOT NULL,
  token TEXT NOT NULL,
  exp INTEGER NOT NULL,
  iat INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
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


