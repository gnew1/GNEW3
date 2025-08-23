
export const cfg = {
  port: Number(process.env.PORT ?? 8080),
  dbUrl: process.env.DATABASE_URL ?? "data/recovery.db",
  notify: {
    emailFrom: process.env.NOTIFY_EMAIL_FROM ?? "noreply@gnew.local",
    smtpUrl: process.env.SMTP_URL,
    twilio: {
      sid: process.env.NOTIFY_TWILIO_SID,
      token: process.env.NOTIFY_TWILIO_TOKEN,
      from: process.env.NOTIFY_TWILIO_FROM
    },
    webhookUrl: process.env.WEBHOOK_URL
  },
  limits: {
    perIpPerMin: 60,
    perWalletPerHour: 200
  }
} as const;


