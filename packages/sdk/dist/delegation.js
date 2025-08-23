import { ethers } from "ethers";
import DelegationAbi from "@gnew/contracts/artifacts/src/governance/Delegation.sol/Delegation.js;
on;
" assert { type: ";
json;
" }; ;
export const scopes = {
    TOKEN_VOTES: ethers.id("TOKEN_VOTES"),
    REPUTATION_VOTES: ethers.id("REPUTATION_VOTES"),
};
export function getDelegation(address, signerOrProvider) {
    return new ethers.Contract(address, DelegationAbi.abi, signerOrProvider);
}
