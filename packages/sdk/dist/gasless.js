import { AbiCoder } from "ethers";
export async function requestTicket(endpoint, ask, fetchFn) {
    const f = fetchFn ?? globalThis.fetch;
    if (!f)
        throw new Error("fetch_not_available");
    const r = await f(`${endpoint}/ticket`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ask),
    });
    if (!r.ok)
        throw new Error(await r.text());
    return (await r.json());
}
/**
 * Compose paymasterAndData = paymaster | abi.encode(ticket) | sig
 * Ensure the tuple layout matches the Paymaster contract exactly.
 */
export function encodePaymasterAndData(paymasterAddr, t, sig) {
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
