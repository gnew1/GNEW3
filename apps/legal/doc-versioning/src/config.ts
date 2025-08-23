
export const cfg = {
  port: Number(process.env.PORT ?? 8098),
  dbUrl: process.env.DATABASE_URL ?? "data/doc_versioning.db",
  chain: {
    rpcUrl: process.env.CHAIN_RPC_URL,
    chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : undefined,
    registryAddress: process.env.REGISTRY_ADDRESS,
    privateKey: process.env.REGISTRY_PRIVATE_KEY
  }
} as const;


