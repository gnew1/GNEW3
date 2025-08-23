
/**
 * GNEW · N328 — Tax computation core
 * Extiende el motor fiscal con cálculo línea por línea y totales.
 */

import { z } from "zod";

export const CalcInput = z.object({
  jurisdiction: z.string().min(2),
  seller: z.object({
    country: z.string().min(2),
    region: z.string().optional(),
    vatId: z.string().optional(),
  }),
  buyer: z.object({
    country: z.string().min(2),
    region: z.string().optional(),
    taxId: z.string().optional(),
    b2b: z.boolean().default(false),
  }),
  items: z.array(
    z.object({
      sku: z.string(),
      category: z.string().default("general"),
      price: z.number().nonnegative(),
      qty: z.number().int().positive(),
    })
  ).min(1),
  currency: z.string().min(3).max(8).default("EUR"),
  shipToCountry: z.string().optional(),
});

type RuleOutcome = {
  vatRate?: number;
  salesTaxRate?: number;
  withholdingRate?: number;
  reverseCharge?: boolean;
};

type Ruleset = {
  rules: Array<{
    id: string;
    when: Record<string, any>;
    outcome: RuleOutcome;
  }>;
};

type Rates = Record<string, any>;

type LineOut = {
  sku: string;
  base: number;
  vatRate?: number;
  salesTaxRate?: number;
  withholdingRate?: number;
  tax: number;
  withholding?: number;
  total: number;
  notes?: string[];
};

function match(obj: Record<string, any>, when: Record<string, any>) {
  return Object.entries(when).every(([k, v]) => {
    const [a, b] = k.split(".");
    const got = b ? obj[a]?.[b] : obj[a];
    return got === v;
  });
}

export function calculateTaxes(input: z.infer<typeof CalcInput>, rules: Ruleset, rates: Rates) {
  const destination = input.shipToCountry ?? input.buyer.country;
  const ctx = {
    b2b: input.buyer.b2b,
    destination,
    sellerCountry: input.seller.country,
    buyerCountry: input.buyer.country,
  };
  const lines: LineOut[] = [];
  let subtotal = 0, totalTax = 0, totalWithhold = 0;

  for (const it of input.items) {
    const base = it.price * it.qty;
    let outcome: RuleOutcome | undefined;
    for (const r of rules.rules) {
      if (match({ ...ctx, item: it }, r.when)) {
        outcome = r.outcome;
        break;
      }
    }
    const vatRate = outcome?.vatRate ?? 0;
    const salesRate = outcome?.salesTaxRate ?? 0;
    const whRate = outcome?.withholdingRate ?? 0;
    const tax = base * (vatRate + salesRate);
    const wh = whRate > 0 ? base * whRate : 0;
    subtotal += base;
    totalTax += tax;
    totalWithhold += wh;
    lines.push({
      sku: it.sku,
      base,
      vatRate,
      salesTaxRate: salesRate,
      withholdingRate: whRate,
      tax,
      withholding: wh,
      total: base + tax - wh,
    });
  }

  return {
    jurisdiction: input.jurisdiction,
    subtotal,
    totalTax,
    totalWithhold,
    grandTotal: subtotal + totalTax - totalWithhold,
    currency: input.currency,
    lines,
  };
}


