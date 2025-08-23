
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export const db = new Database(cfg.dbUrl);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS series(
  id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  year INTEGER NOT NULL,
  code TEXT NOT NULL,    -- p.ej. 'A'
  prefix TEXT NOT NULL,  -- p.ej. 'ES-2025-A-'
  nextNumber INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_series ON series(country,year,code);

CREATE TABLE IF NOT EXISTS customers(
  id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  taxId TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT, zip TEXT
);

CREATE TABLE IF NOT EXISTS invoices(
  id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  currency TEXT NOT NULL,
  seriesId TEXT NOT NULL,
  number TEXT NOT NULL,     -- código legal completo
  issueDate INTEGER NOT NULL,
  supplierName TEXT NOT NULL,
  supplierTaxId TEXT NOT NULL,
  customerId TEXT NOT NULL,
  subtotal REAL NOT NULL,
  taxTotal REAL NOT NULL,
  withholdingTotal REAL NOT NULL,
  total REAL NOT NULL,
  json TEXT NOT NULL        -- factura normalizada (líneas/impuestos)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_invoices_number ON invoices(number);

CREATE TABLE IF NOT EXISTS invoice_lines(
  id TEXT PRIMARY KEY,
  invoiceId TEXT NOT NULL,
  description TEXT NOT NULL,
  qty REAL NOT NULL,
  unitPrice REAL NOT NULL,
  taxCode TEXT NOT NULL,
  taxRate REAL NOT NULL,
  lineTotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS archive(
  id TEXT PRIMARY KEY,
  scopeId TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts INTEGER NOT NULL,
  prevHashHex TEXT NOT NULL,
  hashHex TEXT NOT NULL
);
`);


