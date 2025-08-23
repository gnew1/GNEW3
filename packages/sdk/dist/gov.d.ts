import { ethers } from "ethers";
import type { GnewGovToken } from "@gnew/contracts/typechain-types";
export type { GnewGovToken } from "@gnew/contracts/typechain-types";
export declare function getGnewGovToken(address: string, signerOrProvider: ethers.Signer | ethers.Provider): GnewGovToken;
export declare const GNEW_GOV_TOKEN_ADDRESS: Partial<Record<number, `0x${string}`>>;
import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
