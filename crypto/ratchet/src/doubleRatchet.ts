import { dh, hkdf, open, ready, seal, x25519, KeyPair } from "./crypto";
import type { Header, Packet } from "./types";

const b64u = (a: Uint8Array) => Buffer.from(a).toString("base64url");
const fromB64u = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));

type State = {
  DHs: KeyPair;             // our current DH
  DHr?: Uint8Array;         // their current DH pub
  RK: Uint8Array;           // root key
  CKs: Uint8Array;          // sending chain key
  CKr?: Uint8Array;         // receiving chain key
  Ns: number;               // # msgs in current sending chain
  Nr: number;               // # msgs in current receiving chain
  PN: number;               // length of previous sending chain
  MKSKIPPED: Map<string, Uint8Array>; // map<headerKey, messageKey>
};

export class DoubleRatchet {
  private st!: State;

  static async initAlice(sharedSecret: Uint8Array, bobDhPub: Uint8Array) {
    await ready();
    const DHs = x25519();
    const RK = hkdf(sharedSecret, "RK", 64).slice(0, 32);
    // DH ratchet step
    const kdfI = hkdf(dh(DHs.sk, bobDhPub), "DH", 64);
    const CKs = kdfI.slice(0, 32);
    const CKr = kdfI.slice(32, 64);
    const dr = new DoubleRatchet();
    dr.st = {
      DHs, DHr: bobDhPub, RK, CKs, CKr, Ns: 0, Nr: 0, PN: 0, MKSKIPPED: new Map()
    };
    return dr;
  }

  static async initBob(sharedSecret: Uint8Array, bobKeyPair: KeyPair) {
    await ready();
    const RK = hkdf(sharedSecret, "RK", 64).slice(0, 32);
    const dr = new DoubleRatchet();
    dr.st = { DHs: bobKeyPair, RK, CKs: new Uint8Array(32), Ns: 0, Nr: 0, PN: 0, MKSKIPPED: new Map() };
    return dr;
  }

  private kdfCK(ck: Uint8Array) {
    const out = hkdf(ck, "CK", 64);
    const mk = out.slice(0, 32);
    const nextCK = out.slice(32, 64);
    return { mk, nextCK };
  }

  private headerKey(h: Header) { return `${h.dhPub}.${h.n}`; }

  private trySkipped(h: Header, nonce: Uint8Array, ct: Uint8Array, ad: Uint8Array) {
    const key = this.headerKey(h);
    const mk = this.st.MKSKIPPED.get(key);
    if (!mk) return null;
    try {
      const pt = open(mk, nonce, ct, ad);
      this.st.MKSKIPPED.delete(key);
      return pt;
    } catch { return null; }
  }

  private skipMessageKeys(until: number) {
    if (!this.st.CKr) return;
    while (this.st.Nr < until) {
      const { mk, nextCK } = this.kdfCK(this.st.CKr);
      const hdrDummy: Header = { dhPub: b64u(this.st.DHr!), pn: this.st.PN, n: this.st.Nr };
      this.st.MKSKIPPED.set(this.headerKey(hdrDummy), mk);
      this.st.CKr = nextCK; this.st.Nr++;
    }
  }

  private dhRatchet(theirPub: Uint8Array) {
    // move PN
    this.st.PN = this.st.Ns;
    this.st.Ns = 0;
    this.st.Nr = 0;
    this.st.DHr = theirPub;

    // derive new RK, CKr
    const kdfR = hkdf(dh(this.st.DHs.sk, theirPub), "DH", 64);
    this.st.CKr = kdfR.slice(0, 32);
    this.st.RK = kdfR.slice(32, 64);

    // new DHs
    this.st.DHs = x25519();
    const kdfS = hkdf(dh(this.st.DHs.sk, theirPub), "DH", 64);
    this.st.CKs = kdfS.slice(0, 32);
  }

  send(plaintext: Uint8Array, ad: Uint8Array = new Uint8Array(0)): Packet {
    const { mk, nextCK } = this.kdfCK(this.st.CKs);
    this.st.CKs = nextCK;
    const header: Header = { dhPub: b64u(this.st.DHs.pk), pn: this.st.PN, n: this.st.Ns };
    this.st.Ns++;
    const { ct, nonce } = seal(mk, plaintext, ad);
    return { header, nonce: b64u(nonce), ciphertext: b64u(ct) };
  }

  receive(pkt: Packet, ad: Uint8Array = new Uint8Array(0)): Uint8Array {
    const theirPub = fromB64u(pkt.header.dhPub);
    const nonce = fromB64u(pkt.nonce);
    const ct = fromB64u(pkt.ciphertext);

    // 1) try skipped keys
    const skipped = this.trySkipped(pkt.header, nonce, ct, ad);
    if (skipped) return skipped;

    // 2) if new DH, ratchet
    if (!this.st.DHr || Buffer.compare(Buffer.from(this.st.DHr), Buffer.from(theirPub)) !== 0) {
      this.skipMessageKeys(pkt.header.pn);
      this.dhRatchet(theirPub);
    }

    // 3) skip until n
    this.skipMessageKeys(pkt.header.n);

    // 4) derive mk for this message
    if (!this.st.CKr) throw new Error("No receiving chain");
    const { mk, nextCK } = this.kdfCK(this.st.CKr);
    this.st.CKr = nextCK;
    this.st.Nr++;

    return open(mk, nonce, ct, ad);
  }

  publicKey(): Uint8Array { return this.st.DHs.pk; }
}

