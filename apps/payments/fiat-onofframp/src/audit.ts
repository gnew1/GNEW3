
import crypto from "node:crypto";
import { db } from "./db.js";
import { AuditEntry } from "./models.js";

function latestHash(scopeId: string): string {
  const row = db.prepare("SELECT hashHex FROM audit WHERE scopeId=? ORDER BY ts DESC LIMIT 1")
    .get(scopeId) as { hashHex?: string } | undefined;
  return row?.hashHex ?? "0".repeat(64);
}

export function writeAudit(scopeId: string, kind: string, payload: unknown): AuditEntry {
  const ts = Date.now();
  const prev = latestHash(scopeId);
  const id = crypto.randomUUID();
  const data = JSON.stringify({ id, scopeId, kind, payload, ts, prev });
  const hashHex = crypto.createHash("sha256").update(data).digest("hex");
  const entry: AuditEntry = {
    id, scopeId, kind, payload: JSON.stringify(payload), ts, prevHashHex: prev, hashHex
  };
  db.prepare("INSERT INTO audit(id,scopeId,kind,payload,ts,prevHashHex,hashHex) VALUES(?,?,?,?,?,?,?)")
    .run(entry.id, entry.scopeId, entry.kind, entry.payload, entry.ts, entry.prevHashHex, entry.hashHex);
  return entry;
}

export function listAudit(scopeId: string): AuditEntry[] {
  return db.prepare("SELECT * FROM audit WHERE scopeId=? ORDER BY ts ASC").all(scopeId) as AuditEntry[];
}


