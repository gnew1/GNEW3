
export type Side = "buy" | "sell";

export type QuoteReq = {
  side: Side;
  fiat: string;      // e.g., EUR, USD
  crypto: string;    // e.g., USDC, BTC
  amount: number;    // fiat amount for buy; crypto amount for sell (simplificado)
  walletAddress?: string;
  country?: string;
};

export type Quote = {
  provider: string;
  side: Side;
  fiat: string;
  crypto: string;
  amountInFiat: number;     // normalizado en fiat
  price: number;            // tasa (fiat por 1 crypto) para buy; o inversa para sell, aclarado en 'note'
  feeFixed: number;
  feePct: number;           // 0..1
  etaMinutes: number;
  kycRequired: boolean;
  totalFees: number;        // calculado
  totalToPay: number;       // amountInFiat + fees (buy) / neto recibido (sell)
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

export type KYCRecord = {
  walletId: string;
  status: "pending" | "approved" | "rejected" | "expired";
  evidence: string;   // JSON
  updatedAt: number;
};

export type AuditEntry = {
  id: string;
  scopeId: string; // walletId u orderId
  kind: string;
  payload: string; // JSON
  ts: number;
  prevHashHex: string;
  hashHex: string;
};


