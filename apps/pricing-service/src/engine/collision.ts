
import { Rule } from "./types";

export type Collision = { a: Rule; b: Rule; reason: string };

function overlapIntervals(aMin?: number, aMax?: number, bMin?: number, bMax?: number): boolean {
  const amin = aMin ?? -Infinity;
  const amax = aMax ?? +Infinity;
  const bmin = bMin ?? -Infinity;
  const bmax = bMax ?? +Infinity;
  return Math.max(amin, bmin) <= Math.min(amax, bmax);
}

function overlapArrays(a?: string[], b?: string[]): boolean {
  if (!a && !b) return true;
  if (!a) return true;
  if (!b) return true;
  return a.some((x) => b.includes(x));
}

export function detectCollisions(rules: Rule[]): Collision[] {
  const out: Collision[] = [];
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const A = rules[i];
      const B = rules[j];
      if (A.status !== "active" || B.status !== "active") continue;

      const seg = overlapArrays(A.scope.segments, B.scope.segments);
      const skus = overlapArrays(A.scope.skus, B.scope.skus);
      const risk = overlapIntervals(A.scope.riskMin, A.scope.riskMax, B.scope.riskMin, B.scope.riskMax);
      const qty = overlapIntervals(A.scope.qtyMin, A.scope.qtyMax, B.scope.qtyMin, B.scope.qtyMax);

      if (seg && skus && risk && qty) {
        const reason = `overlap(seg,sku,risk,qty): ${A.id} ↔ ${B.id}`;
        out.push({ a: A, b: B, reason });
      }
    }
  }
  return out;
}


