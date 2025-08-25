import { ethers } from "ethers";
/**
 * Return a GnewGovToken contract instance using a provided ABI.
 * This avoids a hard dependency on @gnew/contracts.
 */
export function getGnewGovToken(address, signerOrProvider, abi) {
    return new ethers.Contract(address, abi, signerOrProvider);
}
