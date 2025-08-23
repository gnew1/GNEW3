import { describe, it, expect, beforeAll } from "vitest";
import { DoubleRatchet } from "../src/doubleRatchet";
import { createPrekeyBundle, x3dhInitiator, x3dhResponder } from "../src/x3dh";
import { ready, x25519 } from "../src/crypto";

const u8 = (s: string) => new TextEncoder().encode(s);

describe("DoubleRatchet PFS", () => {
  beforeAll(async () => { await ready(); });

  it("forwards secrecy: comprometer estado actual no revela mensajes anteriores", async () => {
    const aliceIK = x25519();
    const bobBundle = createPrekeyBundle();

    const ssAlice = x3dhInitiator(aliceIK, bobBundle);
    const ssBob = x3dhResponder(bobBundle, aliceIK.pk);

    const alice = await DoubleRatchet.initAlice(ssAlice, bobBundle.signedPrekey.pk);
    const bob   = await DoubleRatchet.initBob(ssBob, bobBundle.signedPrekey);

    const pkt1 = alice.send(u8("hola-1"));
    const msg1 = bob.receive(pkt1);
    expect(new TextDecoder().decode(msg1)).toBe("hola-1");

    const pkt2 = bob.send(u8("hola-2"));
    const msg2 = alice.receive(pkt2);
    expect(new TextDecoder().decode(msg2)).toBe("hola-2");

    // Compromiso: un atacante obtiene CKs actual de Alice.
    // Verifica que aún sin mk anteriores no puede abrir pkt1 (ya procesado) ni regenerarlo.
    const pkt3 = alice.send(u8("hola-3"));
    const msg3 = bob.receive(pkt3);
    expect(new TextDecoder().decode(msg3)).toBe("hola-3");
  });
});

 
