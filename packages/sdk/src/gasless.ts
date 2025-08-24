import { AbiCoder } from "ethers";

export type Ticket = {
	user: string;
	to: string;
	selector: string; // 0x-prefixed 4-byte selector
	maxValueWei: string; // uint256 as decimal string
	maxGasLimit: number; // uint256, safe number for typical limits
	nonce: number; // uint256
	validUntil: number; // uint48
	validAfter: number; // uint48
	policyId: number; // uint256
	chainId: number; // uint256
};

export type SponsorResponse = { ticket: Ticket; sig: string; signer: string };

type FetchLike = (input: string, init?: any) => Promise<{
	ok: boolean;
	json(): Promise<any>;
	text(): Promise<string>;
}>;

export async function requestTicket(
	endpoint: string,
	ask: { user: string; to: string; selector: string; chainId: number; policyId: number },
	fetchFn?: FetchLike
): Promise<SponsorResponse> {
	const f = fetchFn ?? (globalThis as any).fetch;
	if (!f) throw new Error("fetch_not_available");
	const r = await f(`${endpoint}/ticket`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(ask),
	});
	if (!r.ok) throw new Error(await r.text());
	return (await r.json()) as SponsorResponse;
}

/**
 * Compose paymasterAndData = paymaster | abi.encode(ticket) | sig
 * Ensure the tuple layout matches the Paymaster contract exactly.
 */
export function encodePaymasterAndData(paymasterAddr: string, t: Ticket, sig: string): string {
	const abi = new AbiCoder();
	const tupleType = "tuple(address,address,bytes4,uint256,uint256,uint256,uint48,uint48,uint256,uint256)";
	const data = abi.encode([tupleType, "bytes"], [[
		t.user,
		t.to,
		t.selector,
		t.maxValueWei,
		t.maxGasLimit,
		t.nonce,
		t.validUntil,
		t.validAfter,
		t.policyId,
		t.chainId,
	], sig]);
	return paymasterAddr + data.slice(2);
}
 
