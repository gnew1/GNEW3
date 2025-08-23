
export const cfg = {
  port: Number(process.env.PORT ?? 8114),
  dbUrl: process.env.DATABASE_URL ?? "data/data_catalog.db",
  gluePrefix: process.env.GLUE_CATALOG_PREFIX || null
} as const;


