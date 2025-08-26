import { ethers } from "ethers";
import DelegationAbi from "./abis/Delegation.json";
// Common delegation scopes hashed to bytes32 for on-chain filtering
export const scopes = {
    TOKEN_VOTES: ethers.id("TOKEN_VOTES"),
    REPUTATION_VOTES: ethers.id("REPUTATION_VOTES"),
};
/**
 * Return a Delegation contract instance using a provided ABI.
 * This removes any hard dependency on @gnew/contracts artifacts.
 */
export function getDelegation(address, signerOrProvider, abi) {
    return new ethers.Contract(address, abi, signerOrProvider);
}
/** Convenience: returns contract using bundled minimal ABI. */
export function getDelegationDefault(address, signerOrProvider) {
    const abi = DelegationAbi.abi ?? DelegationAbi;
    return new ethers.Contract(address, abi, signerOrProvider);
}
