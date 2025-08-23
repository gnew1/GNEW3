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
export declare function requestTicket(endpoint: string, ask: {
    user: string;
    to: string;
    selector: string;
    chainId: number;
    policyId: number;
}): Promise<SponsorResponse>;
/**
* Empaqueta paymasterAndData = paymasterAddr | abi.encode(ticket) |
sig
* WARNING: Ajustar layout EXACTO al contrato Paymaster del repo.
*/
export declare function encodePaymasterAndData(paymasterAddr: string, t: Ticket, sig: string): string;
