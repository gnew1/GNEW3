export type Gateway = {
    name: "ipfs" | "arweave";
    urls: string[];
};
export declare const GATEWAYS: Record<string, Gateway>;
export declare function resolveViaGateways(uri: string): string[];
