import { ethers } from "ethers";
import GovAbi from "./abis/GnewGovToken.json";
/**
 * Return a GnewGovToken contract instance using a provided ABI.
 * This avoids a hard dependency on @gnew/contracts.
 */
export function getGnewGovToken(address, signerOrProvider, abi) {
    return new ethers.Contract(address, abi, signerOrProvider);
}
/** Convenience: returns contract using bundled minimal ABI. */
export function getGnewGovTokenDefault(address, signerOrProvider) {
    const abi = GovAbi.abi ?? GovAbi;
    return new ethers.Contract(address, abi, signerOrProvider);
}
