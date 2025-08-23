
export const cfg = {
  port: Number(process.env.PORT ?? 8095),
  dbUrl: process.env.DATABASE_URL ?? "data/integrity_verifier.db"
} as const;


