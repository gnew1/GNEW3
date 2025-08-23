
export const cfg = {
  port: Number(process.env.PORT ?? 8086),
  dbUrl: process.env.DATABASE_URL ?? "data/risk.db"
} as const;


