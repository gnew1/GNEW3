
export function ipfsGateways(cid: string) {
  return [
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`
  ];
}
export function arweaveGateways(txId: string) {
  return [
    `https://arweave.net/${txId}`,
    `https://www.arweave.net/${txId}`,
    `https://ar-io.net/${txId}`
  ];
}


