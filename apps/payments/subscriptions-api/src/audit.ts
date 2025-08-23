
import { db } from "./db.js";
export function audit(scopeId: string, kind: string, payload: unknown) {
  db.prepare("INSERT INTO audit(id,scopeId,kind,payload,ts) VALUES(hex(randomblob(8)),?,?,?,?)")
    .run(scopeId, kind, JSON.stringify(payload), Date.now());
}


