
import { db } from "./db.js";
import { nanoid } from "nanoid";

export interface Dataset {
  id: string;
  namespace: string;
  name: string;
  key: string;
  createdAt: number;
}

export function upsertDataset(ns: string, name: string): { id: string; key: string } {
  const key = `${ns}.${name}`;
  const row = db.prepare("SELECT id FROM datasets WHERE key=?").get(key) as { id: string } | undefined;
  if (row?.id) return { id: row.id, key };
  const id = nanoid();
  db.prepare("INSERT INTO datasets(id,namespace,name,key,createdAt) VALUES(?,?,?,?,?)")
    .run(id, ns, name, key, Date.now());
  // crear versión 1 por defecto
  db.prepare("INSERT INTO dataset_versions(id,datasetId,version,createdAt) VALUES(?,?,?,?)")
    .run(nanoid(), id, 1, Date.now());
  return { id, key };
}

export function bumpVersion(datasetId: string): number {
  const last = db.prepare("SELECT MAX(version) v FROM dataset_versions WHERE datasetId=?").get(datasetId) as { v?: number } | undefined;
  const next = Number(last?.v ?? 1) + 1;
  db.prepare("INSERT INTO dataset_versions(id,datasetId,version,createdAt) VALUES(?,?,?,?)")
    .run(nanoid(), datasetId, next, Date.now());
  return next;
}

export function setSchema(datasetId: string, version: number, cols: Array<{ name: string; type?: string; nullable?: boolean }>) {
  db.prepare("DELETE FROM columns WHERE datasetId=? AND version=?").run(datasetId, version);
  const stmt = db.prepare("INSERT INTO columns(id,datasetId,version,name,type,nullable) VALUES(?,?,?,?,?,?)");
  for (const c of cols) {
    stmt.run(nanoid(), datasetId, version, c.name, c.type ?? null, c.nullable === false ? 0 : 1);
  }
}

export function findDatasetByKey(key: string): Dataset | null {
  return db.prepare("SELECT * FROM datasets WHERE key=?").get(key) as Dataset | null;
}


