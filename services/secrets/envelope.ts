/**
 * Envelope encryption para secretos de servidor (no afecta E2E de mensajes).
 * Usa KMS/HSM para envolver la DEK. Proveedores: AWS KMS, Vault Transit (stubs).
 */
export interface KMS {
  generateDataKey(): Promise<{ plaintext: Uint8Array; ciphertext: Uint8Array }>;
  decrypt(ciphertext: Uint8Array): Promise<Uint8Array>;
}

export class Envelope {
  constructor(private readonly kms: KMS) {}

  async encrypt(plaintext: Uint8Array) {
    const { plaintext: dek, ciphertext: dekWrapped } = await this.kms.generateDataKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey("raw", dek, "AES-GCM", false, ["encrypt"]);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
    return { dek: Buffer.from(dekWrapped).toString("base64url"), iv: Buffer.from(iv).toString("base64url"), ct: Buffer.from(ct).toString("base64url") };
  }

  async decrypt(payload: { dek: string; iv: string; ct: string }) {
    const dek = await this.kms.decrypt(new Uint8Array(Buffer.from(payload.dek, "base64url")));
    const iv = new Uint8Array(Buffer.from(payload.iv, "base64url"));
    const key = await crypto.subtle.importKey("raw", dek, "AES-GCM", false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, new Uint8Array(Buffer.from(payload.ct, "base64url")));
    return new Uint8Array(pt);
  }
}

