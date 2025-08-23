
export const cfg = {
  port: Number(process.env.PORT ?? 8094),
  dbUrl: process.env.DATABASE_URL ?? "data/distributed_pinning.db",
  replicationThreshold: Math.max(1, Number(process.env.REPLICATION_THRESHOLD ?? 2)),
  ipfsApiUrl: process.env.IPFS_API_URL, // e.g., http://127.0.0.1:5001/api/v0
  w3sToken: process.env.WEB3_STORAGE_TOKEN, // Bearer
  bundlr: {
    url: process.env.BUNDLR_URL,           // e.g., https://node1.bundlr.network
    currency: process.env.BUNDLR_CURRENCY, // e.g., arweave
    privateKey: process.env.BUNDLR_PRIVATE_KEY
  }
} as const;

export type Backend = "ipfs" | "web3storage" | "bundlr";
export function enabledBackends(): Backend[] {
  const b: Backend[] = [];
  if (cfg.ipfsApiUrl) b.push("ipfs");
  if (cfg.w3sToken) b.push("web3storage");
  if (cfg.bundlr.url && cfg.bundlr.currency && cfg.bundlr.privateKey) b.push("bundlr");
  return b;
}


