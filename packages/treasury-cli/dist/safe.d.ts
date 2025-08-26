import { ethers } from "ethers";
import { SafeApiKit } from "@safe-global/api-kit";
export declare function getProvider(rpcUrl: string): ethers.JsonRpcProvider;
export declare function getSigner(provider: ethers.JsonRpcProvider, pk: string): ethers.Wallet;
export declare function getSafeSdk(safeAddress: string, signer: ethers.Wallet): Promise<any>;
export declare function getSafeService(serviceUrl: string): any;
export declare function getThresholdAndApprovals(service: SafeApiKit, safeAddress: string): Promise<{
    threshold: any;
    approvals: any;
}>;
