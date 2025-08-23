
import { z } from "zod";

export const ComputeInput = z.object({
  jurisdiction: z.string().min(2),
  seller: z.object({
    country: z.string().min(2),
    region: z.string().optional(),
    vatId: z.string().optional()
  }),
  buyer: z.object({
    country: z.string().min(2),
    region: z.string().optional(),
    taxId: z.string().optional(),
    b2b: z.boolean().default(false)
  }),
  items: z.array(z.object({
    sku: z.string(),
    category: z.string().default("general"),
    price: z.number().nonnegative(),
    qty: z.number().int().positive()
  })).min(1),
  currency: z.string().min(3).max(8).default("EUR"),
  shipToCountry: z.string().optional()
});

type Ruleset = {
  rules: Array<{
    id: string;
    when: Record<string, any>;
    outcome: Partial<{ vatRate: number; salesTaxRate: number; withholdingRate: number; reverseCharge: boolean; }>;
  }>
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
  // simple matcher: all keys equal (supports dot paths limited to 1)
  return Object.entries(when).every(([k, v]) => {
    const [a, b] = k.split(".");
    const got = b ? obj[a]?.[b] : obj[a];
    return got === v;
  });
}

export function computeTaxes(input: z.infer<typeof ComputeInput>, rules: Ruleset, rates: Rates) {
  const destination = input.shipToCountry ?? input.buyer.country;
  const ctx = {
    b2b: input.buyer.b2b,
    destination,
    sellerCountry: input.seller.country,
    buyerCountry: input.buyer.country
  };
  const lines: LineOut[] = [];
  let subtotal = 0, totalTax = 0, totalWithhold = 0;

  for (const it of input.items) {
   


