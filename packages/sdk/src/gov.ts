import { ethers } from "ethers";
import GovAbi from "./abis/GnewGovToken.json";

export type GnewGovToken = ethers.Contract;

/**
 * Return a GnewGovToken contract instance using a provided ABI.
 * This avoids a hard dependency on @gnew/contracts.
 */
export function getGnewGovToken(
  address: string,
  signerOrProvider: ethers.Signer | ethers.Provider,
  abi: ethers.InterfaceAbi
): GnewGovToken {
  return new ethers.Contract(address, abi, signerOrProvider);
}

/** Convenience: returns contract using bundled minimal ABI. */
export function getGnewGovTokenDefault(
  address: string,
  signerOrProvider: ethers.Signer | ethers.Provider
): GnewGovToken {
  const abi: ethers.InterfaceAbi = (GovAbi as { abi?: ethers.InterfaceAbi }).abi ?? (GovAbi as unknown as ethers.InterfaceAbi);
  return new ethers.Contract(address, abi, signerOrProvider);
}

