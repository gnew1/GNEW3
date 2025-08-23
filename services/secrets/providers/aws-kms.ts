// Stub: en prod usa @aws-sdk/client-kms. Mantenemos interfaz común.
import { KMS } from "../envelope";

export class AwsKmsProvider implements KMS {
  async generateDataKey() {
    // llamar KMS.GenerateDataKey(KeyId, KeySpec="AES_256")
    const dek = crypto.getRandomValues(new Uint8Array(32));
    const wrapped = dek; // mock
    return { plaintext: dek, ciphertext: wrapped };
  }
  async decrypt(ciphertext: Uint8Array) {
    return ciphertext; // mock
  }
}

