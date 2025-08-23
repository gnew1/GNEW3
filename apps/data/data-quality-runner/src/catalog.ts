
import Database from "better-sqlite3";
import { cfg } from "./config.js";

export type TableInfo = {
  dbName: string;
  tableName: string;
  location: string | null;
  format: string | null;
  columns: { name: string; type: string; comment?: string | null }[];
  partitionKeys: string[];
};

export function getCatalogDb() {
  const db = new Database(cfg.catalogDbUrl, { readonly: true });
  db.pragma("journal_mode = WAL");
  return db;
}

export function loadTable(dbName: string, tableName: string): TableInfo | null {
  const cat = getCatalogDb();
  const t = cat.prepare("SELECT location, format, partitionKeys FROM tables WHERE dbName=? AND name=?").get(dbName, tableName) as any;
  if (!t) return null;
  const cols = cat.prepare("SELECT name, type, comment, position FROM columns WHERE dbName=? AND tableName=? ORDER BY position ASC").all(dbName, tableName) as any[];
  cat.close();
  return {
    dbName, tableName,
    location: t.location ?? null,
    format: t.format ?? null,
    columns: cols.map((c: any) => ({ name: c.name, type: c.type, comment: c.comment })),
    partitionKeys: JSON.parse(t.partitionKeys ?? "[]")
  };
}


