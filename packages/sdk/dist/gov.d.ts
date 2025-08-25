import { ethers } from "ethers";
export type GnewGovToken = ethers.Contract;
/**
 * Return a GnewGovToken contract instance using a provided ABI.
 * This avoids a hard dependency on @gnew/contracts.
 */
export declare function getGnewGovToken(address: string, signerOrProvider: ethers.Signer | ethers.Provider, abi: ethers.InterfaceAbi): GnewGovToken;
