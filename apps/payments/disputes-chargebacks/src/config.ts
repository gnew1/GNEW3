
export const cfg = {
  port: Number(process.env.PORT ?? 8086),
  dbUrl: process.env.DATABASE_URL ?? "data/disputes.db",
  webhookSecret: process.env.WEBHOOK_SECRET || "demo-secret"
} as const;


