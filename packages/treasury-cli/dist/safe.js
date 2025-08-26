import { ethers } from "ethers";
import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
export function getProvider(rpcUrl) {
    return new ethers.JsonRpcProvider(rpcUrl);
}
export function getSigner(provider, pk) {
    return new ethers.Wallet(pk, provider);
}
export async function getSafeSdk(safeAddress, signer) {
    // Protocol Kit v5+ uses Safe.init with SafeProvider under the hood; default import is a class with static init
    return await Safe.init({
        safeAddress,
        provider: {
            request: async ({ method, params }) => {
                // minimal EIP-1193 shim using signer.provider
                const p = signer.provider;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return await p.send(method, Array.isArray(params) ? params : [params]);
            },
        },
        signer: await signer.getAddress(),
    });
}
export function getSafeService(serviceUrl, chainId) {
    return new SafeApiKit({ txServiceUrl: serviceUrl, chainId: BigInt(chainId) });
}
export async function getThresholdAndApprovals(service, safeAddress) {
    const info = await service.getSafeInfo(safeAddress);
    const pending = await service.getMultisigTransactions(safeAddress, { executed: false });
    const latest = pending.results?.[0];
    const approvals = latest ? latest.confirmations?.length ?? 0 : 0;
    return { threshold: info.threshold, approvals };
}
