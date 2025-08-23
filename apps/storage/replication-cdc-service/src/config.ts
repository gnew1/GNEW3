
export const cfg = {
  port: Number(process.env.PORT ?? 8111),
  dbUrl: process.env.DATABASE_URL ?? "data/replication_cdc.db",
  primary: {
    endpoint: process.env.PRIMARY_S3_ENDPOINT ?? "https://s3.amazonaws.com",
    region: process.env.PRIMARY_S3_REGION ?? "eu-west-1",
    accessKeyId: process.env.PRIMARY_S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.PRIMARY_S3_SECRET_KEY ?? "",
    bucket: process.env.PRIMARY_S3_BUCKET ?? "gnew-primary",
    forcePathStyle: (process.env.PRIMARY_S3_FORCE_PATH_STYLE ?? "0") === "1"
  },
  secondary: {
    endpoint: process.env.SECONDARY_S3_ENDPOINT ?? "https://s3.us-east-1.amazonaws.com",
    region: process.env.SECONDARY_S3_REGION ?? "us-east-1",
    accessKeyId: process.env.SECONDARY_S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.SECONDARY_S3_SECRET_KEY ?? "",
    bucket: process.env.SECONDARY_S3_BUCKET ?? "gnew-secondary",
    forcePathStyle: (process.env.SECONDARY_S3_FORCE_PATH_STYLE ?? "0") === "1"
  }
} as const;


