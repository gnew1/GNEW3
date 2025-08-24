export type Ticket = {
    user: string;
    to: string;
    selector: string;
    maxValueWei: string;
    maxGasLimit: number;
    nonce: number;
    validUntil: number;
    validAfter: number;
    policyId: number;
    chainId: number;
};
export type SponsorResponse = {
    ticket: Ticket;
    sig: string;
    signer: string;
};
type FetchLike = (input: string, init?: any) => Promise<{
    ok: boolean;
    json(): Promise<any>;
    text(): Promise<string>;
}>;
export declare function requestTicket(endpoint: string, ask: {
    user: string;
    to: string;
    selector: string;
    chainId: number;
    policyId: number;
}, fetchFn?: FetchLike): Promise<SponsorResponse>;
/**
 * Compose paymasterAndData = paymaster | abi.encode(ticket) | sig
 * Ensure the tuple layout matches the Paymaster contract exactly.
 */
export declare function encodePaymasterAndData(paymasterAddr: string, t: Ticket, sig: string): string;
export {};
