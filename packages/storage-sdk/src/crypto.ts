
import { keccak256, toBeHex } from "ethers";

export function computeContentHash(bytes: Uint8Array | string): `0x${string}` {
  const data = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  const hash = keccak256(data);
  return hash as `0x${string}`;
}

export function hexToBytes32(hex: `0x${string}`): `0x${string}` {
  if (hex.length !== 66) throw new Error("Expected 32-byte hex");
  return hex;
}


