
export const cfg = {
  port: Number(process.env.PORT ?? 8120),
  dbUrl: process.env.DATABASE_URL ?? "data/anti_bribery.db",
  preMin: Number(process.env.PRE_MIN ?? 60),
  postMin: Number(process.env.POST_MIN ?? 180),
  weights: {
    fundingPre: Number(process.env.W_FUNDING_PRE ?? 0.35),
    returnFlow: Number(process.env.W_RETURN_FLOW ?? 0.30),
    fanOut: Number(process.env.W_FAN_OUT ?? 0.20),
    fresh: Number(process.env.W_FRESH ?? 0.10),
    gasPayer: Number(process.env.W_GAS_PAYER ?? 0.05),
    escrow: Number(process.env.W_ESCROW ?? 0.15)
  },
  alertThreshold: Number(process.env.ALERT_THRESHOLD ?? 0.65)
} as const;


