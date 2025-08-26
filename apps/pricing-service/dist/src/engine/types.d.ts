export type DiscountEffect = {
    type: "percent";
    value: number;
    cap?: number;
} | {
    type: "fixed";
    value: number;
};
export type RuleEffect = {
    type: "discount";
    discount: DiscountEffect;
} | {
    type: "price_override";
    value: number;
};
export type RuleScope = {
    segments?: string[];
    skus?: string[];
    riskMin?: number;
    riskMax?: number;
    qtyMin?: number;
    qtyMax?: number;
};
export type Rule = {
    id: string;
    name: string;
    status: "active" | "disabled";
    priority: number;
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
    riskScore: number;
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
