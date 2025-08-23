import { ethers } from "ethers"; 
import Safe, { EthersAdapter, SafeFactory } from 
"@safe-global/protocol-kit"; 
import { SafeApiKit } from "@safe-global/api-kit"; 
export function getProvider(rpcUrl: string) { 
return new ethers.JsonRpcProvider(rpcUrl); 
} 
export function getSigner(provider: ethers.JsonRpcProvider, pk: 
string) { 
return new ethers.Wallet(pk, provider); 
} 
export async function getSafeSdk( 
safeAddress: string, 
signer: ethers.Wallet 
) { 
const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: 
signer }); 
return await Safe.create({ safeAddress, ethAdapter }); 
} 
export function getSafeService(serviceUrl: string) { 
return new SafeApiKit({ txServiceUrl: serviceUrl }); 
} 
export async function getThresholdAndApprovals( 
service: SafeApiKit, 
safeAddress: string 
) { 
const info = await service.getSafeInfo(safeAddress); 
const pending = await service.getMultisigTransactions(safeAddress, 
"pending"); 
const latest = pending.results?.[0]; 
const approvals = latest ? latest.confirmations?.length ?? 0 : 0; 
return { threshold: info.threshold, approvals }; 
} 
