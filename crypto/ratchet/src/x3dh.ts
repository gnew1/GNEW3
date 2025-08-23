import { dh, hkdf, x25519, KeyPair } from "./crypto";

/**
 * X3DH simplificado (IK -> SPK -> OPK) para obtener secreto compartido inicial.
 * En producción: firmar SPK, publicar prekeys con expiración, validaciones de identidad (DID).
 */
export type PrekeyBundle = { identity: KeyPair; signedPrekey: KeyPair; oneTime?: KeyPair };

export function createPrekeyBundle(): PrekeyBundle {
  return { identity: x25519(), signedPrekey: x25519(), oneTime: x25519() };
}

export function x3dhInitiator(aliceIK: KeyPair, bob: PrekeyBundle) {
  const k1 = dh(aliceIK.sk, bob.identity.pk);
  const k2 = dh(aliceIK.sk, bob.signedPrekey.pk);
  const k3 = bob.oneTime ? dh(aliceIK.sk, bob.oneTime.pk) : new Uint8Array(32);
  const ss = hkdf(new Uint8Array([...k1, ...k2, ...k3]), "X3DH", 64).slice(0, 32);
  return ss;
}

export function x3dhResponder(bob: PrekeyBundle, aliceIdentityPub: Uint8Array) {
  const k1 = dh(bob.identity.sk, aliceIdentityPub);
  const k2 = dh(bob.signedPrekey.sk, aliceIdentityPub);
  const k3 = bob.oneTime ? dh(bob.oneTime.sk, aliceIdentityPub) : new Uint8Array(32);
  const ss = hkdf(new Uint8Array([...k1, ...k2, ...k3]), "X3DH", 64).slice(0, 32);
  return ss;
}

