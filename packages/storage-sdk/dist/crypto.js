import { keccak256 } from "ethers";
export function computeContentHash(bytes) {
    const data = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
    const hash = keccak256(data);
    return hash;
}
export function hexToBytes32(hex) {
    if (hex.length !== 66)
        throw new Error("Expected 32-byte hex");
    return hex;
}
