
export const cfg = {
  port: Number(process.env.PORT ?? 8098),
  dbUrl: process.env.DATABASE_URL ?? "data/quality.db",
  webhookUrl: process.env.WEBHOOK_URL || null
} as const;


