
import { db } from "./db.js";

export type Thresholds = Record<string, number>;
export function getPolicy() {
  const r = db.prepare("SELECT * FROM policy WHERE id=1").get() as any;
  return { version: r.version, review: JSON.parse(r.reviewThresholds), block: JSON.parse(r.blockThresholds), hard: JSON.parse(r.hardBlockTerms) as string[] };
}
export function updatePolicy(p: Partial<{ review: Thresholds; block: Thresholds; hard: string[] }>) {
  const cur = getPolicy();
  const next = { review: { ...cur.review, ...(p.review ?? {}) }, block: { ...cur.block, ...(p.block ?? {}) }, hard: p.hard ?? cur.hard };
  const newVersion = (cur.version ?? 1) + 1;
  db.prepare("UPDATE policy SET version=?, reviewThresholds=?, blockThresholds=?, hardBlockTerms=? WHERE id=1")
    .run(newVersion, JSON.stringify(next.review), JSON.stringify(next.block), JSON.stringify(next.hard));
  return getPolicy();
}


