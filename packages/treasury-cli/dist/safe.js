import { ethers } from "ethers";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import { SafeApiKit } from "@safe-global/api-kit";
export function getProvider(rpcUrl) {
    return new ethers.JsonRpcProvider(rpcUrl);
}
export function getSigner(provider, pk) {
    return new ethers.Wallet(pk, provider);
}
export async function getSafeSdk(safeAddress, signer) {
    const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: signer });
    return await Safe.create({ safeAddress, ethAdapter });
}
export function getSafeService(serviceUrl) {
    return new SafeApiKit({ txServiceUrl: serviceUrl });
}
export async function getThresholdAndApprovals(service, safeAddress) {
    const info = await service.getSafeInfo(safeAddress);
    const pending = await service.getMultisigTransactions(safeAddress, "pending");
    const latest = pending.results?.[0];
    const approvals = latest ? latest.confirmations?.length ?? 0 : 0;
    return { threshold: info.threshold, approvals };
}
