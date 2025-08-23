
export const cfg = {
  port: Number(process.env.PORT ?? 8084),
  dbUrl: process.env.DATABASE_URL ?? "data/marketplace_fees.db"
} as const;


