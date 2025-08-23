
import { ensureLocalKey, kmsWrapDEK_local, kmsUnwrapDEK_local, rotateLocalKey } from "./local.js";

export type KmsProvider = "local" | "aws" | "vault";

export function ensureActiveKek(): { provider: KmsProvider; version: number } {
  // Solo local implementado; AWS/Vault stubs
  const { version } = ensureLocalKey();
  return { provider: "local", version };
}

export function wrapDEK(provider: KmsProvider, version: number, dek: Uint8Array): string {
  if (provider === "local") return kmsWrapDEK_local(dek, version);
  throw new Error("kms_provider_not_configured");
}

export function unwrapDEK(provider: KmsProvider, version: number, wrappedB64: string): Uint8Array {
  if (provider === "local") return kmsUnwrapDEK_local(wrappedB64, version);
  throw new Error("kms_provider_not_configured");
}

export function rotateKEK(): { provider: KmsProvider; version: number } {
  return rotateLocalKey();
}


