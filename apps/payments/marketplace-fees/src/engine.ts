
import { db } from "./db.js";
import { applyPctPpm, clamp } from "./money.js";

export type Rule = {
  feePct: number;   // ppm
  minFee: number;   // minor units
  capFee: number;   // minor units
};

export function pickRule(partnerId: string, category: string | null, currency: string): Rule {
  // prioridad: regla de partner+categoria -> partner -> categoria -> global
  const q = db.prepare(`
    SELECT * FROM fee_rules
    WHERE currency=? AND (
      (scope='partner' AND partnerId=? AND (category IS NULL OR category=?)) OR
      (scope='category' AND category=?) OR
      (scope='global')
    )
    ORDER BY
      (scope='partner' AND category IS NOT NULL) DESC,
      (scope='partner' AND category IS NULL) DESC,
      (scope='category') DESC,
      createdAt DESC
    LIMIT 1
  `);
  const r = q.get(currency, partnerId, category, category) as any;
  if (r) return { feePct: r.feePct, minFee: r.minFee, capFee: r.capFee };

  // fallback: default del partner, si existe
  const p = db.prepare("SELECT defaultFeePct FROM partners WHERE id=?").get(partnerId) as any;
  const feePct = p?.defaultFeePct ?? 0;
  return { feePct, minFee: 0, capFee: Number.MAX_SAFE_INTEGER };
}

export function computeSplit(params: {
  partnerId: string;
  currency: string;
  netMinor: number;         // gross - tax (minor units)
  category?: string | null;
  withholdingPctPpm?: number; // ppm
}) {
  const rule = pickRule(params.partnerId, params.category ?? null, params.currency);
  const platform = clamp(applyPctPpm(params.netMinor, rule.feePct), rule.minFee, rule.capFee);
  const partnerGross = params.netMinor - platform;
  const withholding = params.withholdingPctPpm && params.withholdingPctPpm > 0
    ? applyPctPpm(partnerGross, params.withholdingPctPpm)
    : 0;
  const partnerNet = partnerGross - withholding;
  return { platform, partnerGross, withholding, partnerNet, rule };
}


