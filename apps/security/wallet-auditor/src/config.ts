
export const cfg = {
  port: Number(process.env.PORT ?? 8092),
  dbUrl: process.env.DATABASE_URL ?? "data/wallet_auditor.db"
} as const;


