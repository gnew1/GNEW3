type AACharge = {
    sender: string;
    target: string;
    data: string;
    paymaster?: string;
};
export declare class BundlerClient {
    private bundlerRpc;
    private entryPoint;
    constructor(bundlerRpc: string, entryPoint: string);
    chargeViaAA(req: AACharge): Promise<string>;
}
export {};
