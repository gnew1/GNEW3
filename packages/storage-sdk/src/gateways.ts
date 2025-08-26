
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://dweb.link/ipfs/"
];

const ARWEAVE_GATEWAYS
  = [
    "https://arweave.net/",
    "https://www.arweave.net/",
  ];

export type Gateway = {
  name: "ipfs" | "arweave";
  urls: string[];
};

export const GATEWAYS: Record<string, Gateway> = {
  ipfs: { name: "ipfs", urls: IPFS_GATEWAYS },
  arweave: { name: "arweave", urls: ARWEAVE_GATEWAYS },
};

export function resolveViaGateways(uri: string): string[] {
  if (uri.startsWith("ipfs://")) {
    const cid = uri.slice("ipfs://".length);
    return IPFS_GATEWAYS.map((g) => g + cid);
  }
  if (uri.startsWith("ar://")) {
    const id = uri.slice("ar://".length);
    return ARWEAVE_GATEWAYS.map((g) => g + id);
  }
  return [uri];
}


