
export const cfg = {
  port: Number(process.env.PORT ?? 8110),
  dbUrl: process.env.DATABASE_URL ?? "data/multi_region_store.db",
  activeRegion: (process.env.ACTIVE_REGION ?? "primary") as "primary" | "secondary",
  failoverMode: (process.env.FAILOVER_MODE ?? "auto") as "auto" | "manual",
  presignExpires: Number(process.env.PRESIGN_EXPIRES ?? 900),

  primary: {
    endpoint: process.env.PRIMARY_S3_ENDPOINT ?? "https://s3.amazonaws.com",
    region: process.env.PRIMARY_S3_REGION ?? "eu-west-1",
    accessKeyId: process.env.PRIMARY_S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.PRIMARY_S3_SECRET_KEY ?? "",
    bucket: process.env.PRIMARY_S3_BUCKET ?? "gnew-primary",
    forcePathStyle: (process.env.PRIMARY_S3_FORCE_PATH_STYLE ?? "0") === "1"
  },

  secondary: process.env.SECONDARY_S3_ENDPOINT ? {
    endpoint: process.env.SECONDARY_S3_ENDPOINT!,
    region: process.env.SECONDARY_S3_REGION ?? "us-east-1",
    accessKeyId: process.env.SECONDARY_S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.SECONDARY_S3_SECRET_KEY ?? "",
    bucket: process.env.SECONDARY_S3_BUCKET ?? "gnew-secondary",
    forcePathStyle: (process.env.SECONDARY_S3_FORCE_PATH_STYLE ?? "0") === "1"
  } : null
} as const;


