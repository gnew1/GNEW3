
export const cfg = {
  port: Number(process.env.PORT ?? 8081),
  dbUrl: process.env.DATABASE_URL ?? "data/fiat_ramp.db",
  webhookToleranceSec: Number(process.env.WEBHOOK_TOLERANCE_SEC ?? 300),
  limits: {
    perIpPerMin: 60,
    perWalletPerHour: 200
  },
  providers: {
    mock: {
      apiKey: process.env.PROVIDER_MOCK_APIKEY ?? "mock-key",
      webhookSecrets: ["v1=" + (process.env.PROVIDER_MOCK_WEBHOOK_SECRET_V1 ?? "mock-secret")]
    }
  }
} as const;


