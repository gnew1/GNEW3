import { ethers } from "ethers";
import type { GnewGovToken } from "@gnew/contracts/typechain-types";
import GnewGovTokenAbi from "@gnew/contracts/artifacts/src/governance/GnewGovToken.sol/GnewGovToken.json" assert { type: "json" };

export type { GnewGovToken } from "@gnew/contracts/typechain-types";

/**
 * Return a typed GnewGovToken contract instance.
 */
export function getGnewGovToken(
  address: string,
  signerOrProvider: ethers.Signer | ethers.Provider
): GnewGovToken {
  return new ethers.Contract(address, GnewGovTokenAbi.abi, signerOrProvider) as unknown as GnewGovToken;
}

