
export const cfg = {
  port: Number(process.env.PORT ?? 8099),
  dbUrl: process.env.DATABASE_URL ?? "data/e2ee_store.db",
  hmacSecret: (process.env.ACCESS_TOKEN_SECRET && Buffer.from(process.env.ACCESS_TOKEN_SECRET)) || cryptoRandom(32),
  localKmsPass: process.env.LOCAL_KMS_KEY_PASS ?? null,
  blobsDir: "data/blobs"
} as const;

function cryptoRandom(n: number) {
  const c = awaitableRandom(n);
  return c;
}
async function awaitableRandom(n: number) {
  const { randomBytes } = await import("node:crypto");
  return randomBytes(n);
}


