
import crypto from "node:crypto";
import { db } from "./db.js";
import { AuditEntry } from "./models.js";

function latestHash(walletId: string): string {
  const row = db.prepare("SELECT hashHex FROM audit WHERE walletId=? ORDER BY ts DESC LIMIT 1").get(walletId) as { hashHex?: string } | undefined;
  return row?.hashHex ?? "0".repeat(64);
}

export function writeAudit(walletId: string, kind: AuditEntry["kind"], payload: unknown): AuditEntry {
  const prev = latestHash(walletId);
  const ts = Date.now();
  const id = crypto.randomUUID();
  const data = JSON.stringify({ id, walletId, kind, payload, ts, prev });
  const hashHex = crypto.createHash("sha256").update(data).digest("hex");
  const entry: AuditEntry = {
    id, walletId, kind, payload: JSON.stringify(payload), ts,
    prevHashHex: prev, hashHex
  };
  db.prepare("INSERT INTO audit(id,walletId,kind,payload,ts,prevHashHex,hashHex) VALUES(?,?,?,?,?,?,?)")
    .run(entry.id, entry.walletId, entry.kind, entry.payload, entry.ts, entry.prevHashHex, entry.hashHex);
  return entry;
}

export function listAudit(walletId: string): AuditEntry[] {
  return db.prepare("SELECT * FROM audit WHERE walletId=? ORDER BY ts ASC").all(walletId) as AuditEntry[];
}


