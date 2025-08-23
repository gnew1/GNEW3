import { ethers } from "ethers";
export type Delegation = ethers.Contract;
export declare const scopes: {
    TOKEN_VOTES: any;
    REPUTATION_VOTES: any;
};
export declare function getDelegation(address: string, signerOrProvider: ethers.Signer | ethers.Provider): Delegation;
