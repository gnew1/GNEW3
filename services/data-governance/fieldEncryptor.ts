
/**
 * M16: Gobierno del dato, retención y cifrado por campo
 * Servicio para aplicar políticas de cifrado por campo, anonimización
 * y control de retención de datos sensibles en GNEW.
 */
import crypto from "crypto";

interface FieldPolicy {
  encrypt: boolean;
  retentionDays: number;
  anonymize?: boolean;
}

const ALGORITHM = "aes-256-gcm";

export class FieldEncryptor {
  private key: Buffer;
  private policies: Record<string, FieldPolicy> = {};

  constructor(secret: string) {
    this.key = crypto.createHash("sha256").update(secret).digest();
  }

  setPolicy(field: string, policy: FieldPolicy) {
    this.policies[field] = policy;
  }

  encryptField(field: string, value: any): string | null {
    const policy = this.policies[field];
    if (!policy || !policy.encrypt) return value;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    let encrypted = cipher.update(String(value), "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${tag}:${encrypted}`;
  }

  decryptField(field: string, encrypted: string): string | null {
    const policy = this.policies[field];
    if (!policy || !policy.encrypt) return encrypted;

    const [ivHex, tagHex, data] = encrypted.split(":");
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    let decrypted = decipher.update(data, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  enforceRetention(field: string, createdAt: Date, value: string): string | null {
    const policy = this.policies[field];
    if (!policy) return value;
    const expiration = new Date(createdAt);
    expiration.setDate(expiration.getDate() + policy.retentionDays);
    if (new Date() > expiration) return null;
    return value;
  }
}


