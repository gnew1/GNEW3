
export const cfg = {
  port: Number(process.env.PORT ?? 8096),
  dbUrl: process.env.DATABASE_URL ?? "data/moderation.db",
  webhookUrl: process.env.WEBHOOK_URL
} as const;


