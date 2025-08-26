import { ethers } from "ethers";
export type Delegation = ethers.Contract;
export declare const scopes: {
    readonly TOKEN_VOTES: string;
    readonly REPUTATION_VOTES: string;
};
/**
 * Return a Delegation contract instance using a provided ABI.
 * This removes any hard dependency on @gnew/contracts artifacts.
 */
export declare function getDelegation(address: string, signerOrProvider: ethers.Signer | ethers.Provider, abi: ethers.InterfaceAbi): Delegation;
/** Convenience: returns contract using bundled minimal ABI. */
export declare function getDelegationDefault(address: string, signerOrProvider: ethers.Signer | ethers.Provider): Delegation;
