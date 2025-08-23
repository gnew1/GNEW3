
export const cfg = {
  port: Number(process.env.PORT ?? 8115),
  dbUrl: process.env.DATABASE_URL ?? "data/data_quality.db",
  catalogDbUrl: process.env.CATALOG_DB_URL ?? "data/data_catalog.db",
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "https://s3.amazonaws.com",
    region: process.env.S3_REGION ?? "eu-west-1",
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "0") === "1"
  }
} as const;


