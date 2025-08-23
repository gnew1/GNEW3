import { ethers } from "ethers"; 
import DelegationAbi from 
"@gnew/contracts/artifacts/src/governance/Delegation.sol/Delegation.js
 on" assert { type: "json" }; 
 
export type Delegation = ethers.Contract; 
 
export const scopes = { 
  TOKEN_VOTES: ethers.id("TOKEN_VOTES"), 
  REPUTATION_VOTES: ethers.id("REPUTATION_VOTES"), 
}; 
 
export function getDelegation(address: string, signerOrProvider: 
ethers.Signer | ethers.Provider): Delegation { 
  return new ethers.Contract(address, DelegationAbi.abi, 
signerOrProvider); 
} 
 
