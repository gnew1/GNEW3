
import crypto from "node:crypto";
import { db } from "./db.js";

function latest(scopeId: string): string {
  const r = db.prepare("SELECT hashHex FROM audit WHERE scopeId=? ORDER BY ts DESC LIMIT 1").get(scopeId) as any;
  return r?.hashHex ?? "0".repeat(64);
}
export function writeAudit(scopeId: string, kind: string, payload: unknown) {
  const prev = latest(scopeId);
  const ts = Date.now();
  const id = crypto.randomUUID();
  const data = JSON.stringify({ id, scopeId, kind, payload, ts, prev });
  const hashHex = crypto.createHash("sha256").update(data).digest("hex");
  db.prepare("INSERT INTO audit(id,scopeId,kind,payload,ts,prevHashHex,hashHex) VALUES(?,?,?,?,?,?,?)")
    .run(id, scopeId, kind, JSON.stringify(payload), ts, prev, hashHex);
}


