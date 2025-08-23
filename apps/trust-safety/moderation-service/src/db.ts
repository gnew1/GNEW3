
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS contents(
  id TEXT PRIMARY KEY,
  userId TEXT,
  lang TEXT,
  text TEXT NOT NULL,
  hashHex TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS moderations(
  id TEXT PRIMARY KEY,
  contentId TEXT NOT NULL,
  decision TEXT NOT NULL,      -- allow|review|block
  categories TEXT NOT NULL,    -- json {cat:score}
  reasons TEXT NOT NULL,       -- json string[]
  actions TEXT NOT NULL,       -- json string[]
  policyVersion INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_mod_content ON moderations(contentId, createdAt DESC);

CREATE TABLE IF NOT EXISTS policy(
  id INTEGER PRIMARY KEY CHECK (id=1),
  version INTEGER NOT NULL,
  reviewThresholds TEXT NOT NULL,  -- json {cat: number}
  blockThresholds TEXT NOT NULL,   -- json {cat: number}
  hardBlockTerms TEXT NOT NULL     -- json string[] (regex/globs simples)
);
INSERT OR IGNORE INTO policy(id,version,reviewThresholds,blockThresholds,hardBlockTerms)
VALUES(1,1,
  '{"sexual":0.4,"violence":0.4,"hate":0.3,"harassment":0.4,"self_harm":0.2,"illegal_goods":0.3,"piracy":0.4,"spam":0.6,"scam":0.4,"pii":0.6,"profanity":0.8}',
  '{"sexual":0.8,"violence":0.8,"hate":0.6,"harassment":0.8,"self_harm":0.6,"illegal_goods":0.7,"piracy":0.8,"spam":0.95,"scam":0.8,"pii":0.95,"profanity":1.1}',
  '[]'
);

CREATE TABLE IF NOT EXISTS lists(
  id TEXT PRIMARY KEY,
  list TEXT NOT NULL,     -- denyTerms|allowTerms|denyUsers|allowUsers
  value TEXT NOT NULL,
  note TEXT,
  updatedAt INTEGER NOT NULL,
  UNIQUE(list,value)
);

CREATE TABLE IF NOT EXISTS labels(
  id TEXT PRIMARY KEY,
  contentId TEXT NOT NULL,
  label TEXT NOT NULL,    -- allowed|blocked|needs_changes
  note TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS appeals(
  id TEXT PRIMARY KEY,
  contentId TEXT NOT NULL,
  userId TEXT NOT NULL,
  message TEXT NOT NULL,
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


