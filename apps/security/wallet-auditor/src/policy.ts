
import { db } from "./db.js";

export function getPolicy() {
  return db.prepare("SELECT * FROM policy WHERE id=1").get() as any;
}
export function setPolicy(p: Partial<{ warnThreshold: number; blockThreshold: number }>) {
  const cur = getPolicy();
  const next = { ...cur, ...p };
  db.prepare("UPDATE policy SET warnThreshold=?, blockThreshold=? WHERE id=1")
    .run(next.warnThreshold, next.blockThreshold);
  return getPolicy();
}


