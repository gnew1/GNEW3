
export type DiscountEffect =
  | { type: "percent"; value: number; cap?: number } // value 0..100
  | { type: "fixed"; value: number }; // currency unit

export type RuleEffect = { type: "discount"; discount: DiscountEffect } | { type: "price_override"; value: number };

export type RuleScope = {
  segments?: string[];
  skus?: string[];
  riskMin?: number; // 0..1
  riskMax?: number; // 0..1
  qtyMin?: number;
  qtyMax?: number;
};

export type Rule = {
  id: string;
  name: string;
  status: "active" | "disabled";
  priority: number; // lower first
  exclusive?: boolean;
  scope: RuleScope;
  effect: RuleEffect;
};

export type Ruleset = {
  id: string;
  name: string;
  version: number;
  status: "draft" | "published" | "deprecated";
  label?: string;
  rules: Rule[];
  createdAt: string;
  createdBy: string;
  notes?: string;
};

export type QuoteInput = {
  sku: string;
  basePrice: number;
  currency: string;
  userId: string;
  segment?: string;
  riskScore: number; // 0..1
  quantity: number;
};

export type QuoteResult = {
  sku: string;
  currency: string;
  basePrice: number;
  finalPrice: number;
  discountTotal: number;
  appliedRules: string[];
  rulesetVersion: number;
  rulesetId: string;
  versionLabel?: string;
};


