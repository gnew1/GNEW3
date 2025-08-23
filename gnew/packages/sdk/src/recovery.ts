import { ethers } from "ethers"; 
export function buildApproveTypedData(chainId:number, 
verifyingContract:string, nonce:bigint, proposed:string, 
guardian:string) { 
return { 
domain: { name: "GNEW Social Recovery", version: "1", chainId, 
verifyingContract }, 
types: { ApproveRecovery: [{ name:"nonce", type:"uint256" },{ 
name:"proposed", type:"address" },{ name:"guardian", type:"address" 
}]}, 
primaryType: "ApproveRecovery" as const, 
message: { nonce, proposed, guardian } 
}; 
} 
export async function signApproval(wallet: ethers.Wallet, typed: any) 
{ 
return await wallet.signTypedData(typed.domain, typed.types, 
typed.message); 
} 
