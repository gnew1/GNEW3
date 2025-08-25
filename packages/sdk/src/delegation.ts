import { ethers } from "ethers";
import DelegationAbi from "./abis/Delegation.json";

export type Delegation = ethers.Contract;

// Common delegation scopes hashed to bytes32 for on-chain filtering
export const scopes = {
  TOKEN_VOTES: ethers.id("TOKEN_VOTES"),
  REPUTATION_VOTES: ethers.id("REPUTATION_VOTES"),
} as const;

/**
 * Return a Delegation contract instance using a provided ABI.
 * This removes any hard dependency on @gnew/contracts artifacts.
 */
export function getDelegation(
  address: string,
  signerOrProvider: ethers.Signer | ethers.Provider,
  abi: ethers.InterfaceAbi
): Delegation {
  return new ethers.Contract(address, abi, signerOrProvider);
}

/** Convenience: returns contract using bundled minimal ABI. */
export function getDelegationDefault(
  address: string,
  signerOrProvider: ethers.Signer | ethers.Provider
): Delegation {
  const abi: ethers.InterfaceAbi = (DelegationAbi as { abi?: ethers.InterfaceAbi }).abi ?? (DelegationAbi as unknown as ethers.InterfaceAbi);
  return new ethers.Contract(address, abi, signerOrProvider);
}
 
