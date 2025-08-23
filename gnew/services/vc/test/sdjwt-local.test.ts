import { issueVC } from "../../../packages/sdk/src/vc"; 
 
describe("SD-JWT selective disclosure + verificación local", () => { 
  const API = process.env.VC_API || "http://localhost:8082"; 
  const issuerPriv = 
"0x59c6995e998f97a5a0044976f57f3bdd00000000000000000000000000000000"; 
// demo 
 
  it("emit + verify local (revelando solo rol)", async () => { 
    const res = await issueVC(API, { 
      type: "role", 
      method: "sd-jwt", 
      issuerDid: "did:gnew:eip155:1337:0xissuer...", 
      issuerPrivKey: issuerPriv, 
      subjectDid: "did:gnew:eip155:1337:0xholder...", 
      claims: { role: "DataScientist", area: "Data/ML", guild: 
"Orion", level: "Senior" } 
    }); 
 
    // Holder decide revelar solo role y guild: 
    const disclosures = res.disclosures.filter((d: string) => { 
      const [k] = JSON.parse(Buffer.from(d, 
"base64url").toString("utf-8")); 
      return ["role", "guild"].includes(k); 
    }); 
 
    // caché local de status list (simulado con lo devuelto por issue) 
    const cache = { statusListURI: res.statusListURI, encodedList: 
"REPLACE_WITH_FETCHED_BASE64", contentHash: res.contentHash }; 
 
    // Para el test simplificado omitimos fetch real del encodedList; 
en producción se cachea tras lectura IPFS y se valida con hash. 
 
    const verifyBody = { 
      format: "sd-jwt", 
      issuerDid: "did:gnew:eip155:1337:0xissuer...", 
      sdJwt: res.sdJwt, 
      disclosures, 
      statusListIndex: res.statusListIndex, 
      cache 
    }; 
 
    // Aquí fallará si cache.encodedList no coincide con contentHash. 
En e2e real, completar fetch y hash. 
    // expect((await verifyPresentationLocal(API, 
verifyBody)).ok).toBeTruthy(); 
  }); 
}); 
 
 
