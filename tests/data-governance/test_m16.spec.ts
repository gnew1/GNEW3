
import { expect } from "chai";
import { FieldEncryptor } from "../../services/data-governance/fieldEncryptor";

describe("M16 FieldEncryptor", () => {
  const encryptor = new FieldEncryptor("test-secret");
  encryptor.setPolicy("email", { encrypt: true, retentionDays: 30 });

  it("debería cifrar y descifrar un campo", () => {
    const encrypted = encryptor.encryptField("email", "user@example.com");
    expect(encrypted).to.be.a("string");
    const decrypted = encryptor.decryptField("email", encrypted!);
    expect(decrypted).to.equal("user@example.com");
  });

  it("debería expirar según retención", () => {
    const now = new Date();
    now.setFullYear(now.getFullYear() - 1);
    const result = encryptor.enforceRetention("email", now, "valor");
    expect(result).to.be.null;
  });
});


