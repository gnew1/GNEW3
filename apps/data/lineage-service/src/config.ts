
export const cfg = {
  port: Number(process.env.PORT ?? 8097),
  dbUrl: process.env.DATABASE_URL ?? "data/lineage.db"
} as const;


