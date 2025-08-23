
export const cfg = {
  port: Number(process.env.PORT ?? 8113),
  dbUrl: process.env.DATABASE_URL ?? "data/inventory_analytics.db",
  priceUSD: {
    STANDARD: Number(process.env.PRICE_STANDARD ?? 23),
    STANDARD_IA: Number(process.env.PRICE_STANDARD_IA ?? 12.5),
    ONEZONE_IA: Number(process.env.PRICE_ONEZONE_IA ?? 10),
    GLACIER_IR: Number(process.env.PRICE_GLACIER_IR ?? 4),
    GLACIER: Number(process.env.PRICE_GLACIER ?? 3.6),
    DEEP_ARCHIVE: Number(process.env.PRICE_DEEP_ARCHIVE ?? 1)
  }
} as const;


