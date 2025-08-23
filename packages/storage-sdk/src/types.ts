
export type ProviderResult = {
  ok: boolean;
  cid?: string;
  arweaveId?: string;
  provider: 'web3storage' | 'pinata' | 'arweave';
  error?: string;
};

export type RegisterPayload = {
  contentHash: `0x${string}`; // bytes32 hex
  cid?: string;
  arweaveId?: string;
  did?: string;
};


