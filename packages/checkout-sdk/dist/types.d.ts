export type Side = "buy" | "sell";
export type QuoteReq = {
    side: Side;
    fiat: string;
    crypto: string;
    amount: number;
    walletAddress?: string;
    country?: string;
};
export type Quote = {
    provider: string;
    side: Side;
    fiat: string;
    crypto: string;
    amountInFiat: number;
    price: number;
    feeFixed: number;
    feePct: number;
    etaMinutes: number;
    kycRequired: boolean;
    totalFees: number;
    totalToPay: number;
    note: string;
};
export type Order = {
    id: string;
    provider: string;
    side: Side;
    fiat: string;
    crypto: string;
    amountFiat: number;
    walletAddress: string;
    status: "created" | "pending" | "processing" | "completed" | "failed" | "canceled";
    kycStatus: "unknown" | "pending" | "approved" | "rejected" | "expired";
    createdAt: number;
    updatedAt: number;
    providerRef?: string;
    idempotencyKey: string;
};
export type CreateOrderParams = {
    side: Side;
    fiat: string;
    crypto: string;
    amount: number;
    walletAddress: string;
    provider: string;
    kycEvidence?: unknown;
    idempotencyKey?: string;
};
export type CreatePlanParams = {
    token: string;
    amount: number;
    periodSeconds: number;
    anchorTimestamp: number;
    graceSeconds: number;
};
export type Plan = {
    id: string;
} & CreatePlanParams;
export type CreateSubscriptionParams = {
    planId: string;
    subscriber: string;
    prorateFirst?: boolean;
    startAt?: number;
};
export type Subscription = {
    id: string;
    planId: string;
    subscriber: string;
    status: "active" | "canceled";
    startAt: number;
    nextChargeAt: number;
    graceEndsAt: number;
};
