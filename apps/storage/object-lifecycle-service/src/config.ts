
export const cfg = {
  port: Number(process.env.PORT ?? 8112),
  dbUrl: process.env.DATABASE_URL ?? "data/object_lifecycle.db",
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "https://s3.amazonaws.com",
    region: process.env.S3_REGION ?? "eu-west-1",
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "0") === "1",
    defaultBucket: process.env.DEFAULT_BUCKET ?? null
  }
} as const;


