import sodium from "libsodium-wrappers-sumo";

export type KeyPair = { pk: Uint8Array; sk: Uint8Array };

export async function ready() { await sodium.ready; return sodium; }

export function hkdf(key: Uint8Array, info: string, len = 64) {
  const s = sodium;
  const prk = s.crypto_auth_hmacsha256(key, new Uint8Array(0));
  const out = s.crypto_kdf_derive_from_key(len, 1, info, prk);
  return out;
}

export function x25519() {
  const s = sodium;
  const kp = s.crypto_kx_keypair();
  return { pk: kp.publicKey, sk: kp.privateKey } as KeyPair;
}

export function dh(sk: Uint8Array, pk: Uint8Array) {
  const s = sodium;
  return s.crypto_scalarmult(sk, pk);
}

export function seal(key: Uint8Array, plaintext: Uint8Array, ad: Uint8Array) {
  const s = sodium;
  const nonce = s.randombytes_buf(s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ct = s.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext, ad, null, nonce, key
  );
  return { ct, nonce };
}

export function open(
  key: Uint8Array, nonce: Uint8Array, ct: Uint8Array, ad: Uint8Array
) {
  const s = sodium;
  return s.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null, ct, ad, nonce, key
  );
}

