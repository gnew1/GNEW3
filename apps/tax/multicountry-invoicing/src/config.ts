
export const cfg = {
  port: Number(process.env.PORT ?? 8090),
  dbUrl: process.env.DATABASE_URL ?? "data/tax.db",
  signingKeyPem: process.env.SIGNING_PRIVATE_KEY_PEM // opcional
} as const;


