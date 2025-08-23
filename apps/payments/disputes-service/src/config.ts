
export const cfg = {
  port: Number(process.env.PORT ?? 8085),
  dbUrl: process.env.DATABASE_URL ?? "data/disputes.db",
  sla: {
    inquiry: Number(process.env.SLA_INQUIRY_DAYS ?? 10),
    chargeback: Number(process.env.SLA_CHARGEBACK_DAYS ?? 7),
    representment: Number(process.env.SLA_REPRESENTMENT_DAYS ?? 10),
    prearb: Number(process.env.SLA_PREARB_DAYS ?? 7),
    arbitration: Number(process.env.SLA_ARBITRATION_DAYS ?? 30)
  },
  webhookUrl: process.env.WEBHOOK_URL
} as const;


