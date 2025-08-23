/** 
 * Prueba de interoperabilidad: 
 * - Crear did:gnew y anclar 
 * - Resolver vía servicio y validar metadatos 
 */ 
import { expect } from "chai"; 
import { createDID, resolveDID } from "../../../packages/sdk/src/did"; 
 
describe("Interop DID", () => { 
  const API = process.env.DID_API || "http://localhost:8081"; 
 
  it("create + resolve did:gnew", async () => { 
    const key = "0x59c6995e998f97a5a0044976f57f3bdd" + 
"00000000000000000000000000000000"; // demo 
    const out = await createDID(API, { 
      method: "gnew", 
      controllerPrivKey: key, 
      chainId: 1337, 
      services: [{ id: "#didcomm", type: "DIDCommMessaging", 
serviceEndpoint: "https://msg.gnew.example/123" }], 
      alsoAnchor: true, 
      storage: "inline" 
    }); 
    expect(out.did).to.contain("did:gnew:eip155:1337:"); 
    const res = await resolveDID(API, out.did); 
    expect(res.didDocument.id).to.eq(out.did); 
    expect(res.didDocument.service[0].type).to.eq("DIDCommMessaging"); 
  }); 
}); 
 
 
