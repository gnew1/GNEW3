
import { LRU } from "./lru";
import { qkey } from "../util/hash";
import { Ruleset, QuoteInput, QuoteResult, Rule, DiscountEffect } from "./types";
import { RulesStore } from "../store/rules";

export class PriceEngine {
  private cache: LRU<string, QuoteResult>;
  constructor(private store: RulesStore) {
    const size = Number(process.env.CACHE_SIZE ?? 10_000);
    const ttl = Number(process.env.CACHE_TTL_MS ?? 60_000);
    this.cache = new LRU(size, ttl);
  }

  async quote(input: QuoteInput): Promise<QuoteResult> {
    const rs = this.store.pickRulesetFor(input.segment, input.userId);
    const cacheKey = qkey({
      k: "q",
      sku: input.sku,
      bp: input.basePrice,
      cur: input.currency,
      seg: input.segment ?? "",
      r: Math.round((input.riskScore ?? 0) * 100) / 100,
      q: input.quantity,
      v: rs.version,
      id: rs.id,
    });

    const hit = this.cache.get(cacheKey);
    if (hit) return hit;

    const applied = applyRules(input, rs.rules);
    const out: QuoteResult = {
      ...applied,
      rulesetVersion: rs.version,
      rulesetId: rs.id,
      versionLabel: rs.label,
    };
    this.cache.set(cacheKey, out);
    return out;
  }

  invalidate() {
    this.cache.clear();
  }
}

export function applyRules(input: QuoteInput, rules: Rule[]): Omit<QuoteResult, "rulesetVersion" | "rulesetId"> {
  const sorted = rules
    .filter((r) => r.status === "active")
    .sort((a, b) => a.priority - b.priority);

  let price = input.basePrice;
  let discountTotal = 0;
  const applied: string[] = [];

  for (const r of sorted) {
    if (!matches(r, input)) continue;

    if (r.effect.type === "price_override") {
      const dec = Math.max(0, price - r.effect.value);
      discountTotal += dec;
      price = r.effect.value;
      applied.push(r.id);
      if (r.exclusive) break;
      continue;
    }

    if (r.effect.type === "discount") {
      const d = computeDiscount(price, r.effect.discount);
      discountTotal += d;
      price = Math.max(0, price - d);
      applied.push(r.id);
      if (r.exclusive) break;
    }
  }

  return {
    sku: input.sku,
    currency: input.currency,
    basePrice: input.basePrice,
    finalPrice: roundC(price),
    discountTotal: roundC(discountTotal),
    appliedRules: applied,
  };
}

function roundC(n: number) {
  return Math.round(n * 100) / 100;
}

function inRange(v: number, min?: number, max?: number): boolean {
  if (min != null && v < min) return false;
  if (max != null && v > max) return false;
  return true;
}

function matches(rule: Rule, input: QuoteInput): boolean {
  const s = rule.scope;
  if (s.skus && s.skus.length && !s.skus.includes(input.sku)) return false;
  if (s.segments && s.segments.length && input.segment && !s.segments.includes(input.segment)) return false;
  if (!inRange(input.riskScore, s.riskMin, s.riskMax)) return false;
  if (!inRange(input.quantity, s.qtyMin, s.qtyMax)) return false;
  return true;
}

function computeDiscount(price: number, d: DiscountEffect): number {
  if (d.type === "fixed") {
    return Math.min(price, Math.max(0, d.value));
  }
  // percent
  const raw = (price * Math.max(0, Math.min(100, d.value))) / 100;
  return Math.max(0, Math.min(raw, d.cap ?? raw));
}


