
import { cfg } from "./config.js";
import { ethers } from "ethers";

const ABI = [
  "event Registered(bytes32 indexed hash, string docId, uint256 version, address indexed by)",
  "function registerDocument(bytes32 hash, string docId, uint256 version) external",
  "function getRecord(bytes32 hash) external view returns (string memory docId, uint256 version, address by, uint256 blockTime)"
];

export type OnChainResult =
  | { ok: true; txHash: string; network: string }
  | { ok: false; reason: string };

export async function registerOnChain(sha256Hex: string, docId: string, version: number): Promise<OnChainResult> {
  if (!cfg.chain.rpcUrl || !cfg.chain.registryAddress || !cfg.chain.privateKey) {
    return { ok: false, reason: "onchain_not_configured" };
  }
  const provider = new ethers.JsonRpcProvider(cfg.chain.rpcUrl, cfg.chain.chainId);
  const wallet = new ethers.Wallet(cfg.chain.privateKey, provider);
  const contract = new ethers.Contract(cfg.chain.registryAddress, ABI, wallet);

  const bytes32 = "0x" + sha256Hex.toLowerCase();
  const tx = await contract.registerDocument(bytes32, docId, version);
  const receipt = await tx.wait();
  const net = await provider.getNetwork();
  return { ok: true, txHash: receipt?.hash ?? tx.hash, network: String(net.chainId) };
}

export async function getRecordOnChain(sha256Hex: string): Promise<{ found: boolean; docId?: string; version?: number }> {
  if (!cfg.chain.rpcUrl || !cfg.chain.registryAddress) return { found: false };
  const provider = new ethers.JsonRpcProvider(cfg.chain.rpcUrl, cfg.chain.chainId);
  const contract = new ethers.Contract(cfg.chain.registryAddress, ABI, provider);
  try {
    const bytes32 = "0x" + sha256Hex.toLowerCase();
    const [docId, version] = await contract.getRecord(bytes32);
    if (!docId) return { found: false };
    return { found: true, docId, version: Number(version) };
  } catch {
    return { found: false };
  }
}


