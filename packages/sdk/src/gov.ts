import { ethers } from "ethers";

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

