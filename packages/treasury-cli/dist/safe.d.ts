import { ethers } from "ethers";
import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
export declare function getProvider(rpcUrl: string): ethers.JsonRpcProvider;
export declare function getSigner(provider: ethers.JsonRpcProvider, pk: string): ethers.Wallet;
export declare function getSafeSdk(safeAddress: string, signer: ethers.Wallet): Promise<Safe>;
export declare function getSafeService(serviceUrl: string, chainId: number): SafeApiKit;
export declare function getThresholdAndApprovals(service: SafeApiKit, safeAddress: string): Promise<{
    threshold: number;
    approvals: number;
}>;
