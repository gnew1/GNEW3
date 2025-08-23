
export type Side = "buy" | "sell";

export type QuoteReq = {
  side: Side;
  fiat: string;
  crypto: string;
  amount: number; // para 'buy' es importe fiat
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
  amount: number;            // entero en unidades del token (p.ej., 1000 = 0.001 con 6 decimales)
  periodSeconds: number;
  anchorTimestamp: number;   // 0 para sin prorrateo
  graceSeconds: number;      // <= 30d
};

export type Plan = { id: string } & CreatePlanParams;

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


