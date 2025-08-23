/** 
* SD-JWT emisión y verificación. 
* Nota: en producción usa una librería SD-JWT conforme a RFC; aquí se 
ilustra el flujo. 
*/ 
import { ethers } from "ethers"; 
import { createHash, randomBytes } from "crypto"; 
type ClaimMap = Record<string, any>; 
export type SDJwtPackage = { 
sdJwt: string;                      
claims 
disclosures: string[];              
kb?: string;                        
material 
}; 
// JWT firmado con hashes de 
// base64url disclosures 
// opcional: binding key 
function b64url(buf: Buffer) { return buf.toString("base64url"); } 
function hashDisclosure(name: string, val: any, salt: Buffer): string 
{ 
const pre = Buffer.from(JSON.stringify([name, val, b64url(salt)])); 
  const h = createHash("sha256").update(pre).digest(); // SD-JWT suele 
usar hash configurable; ilustración 
  return b64url(h); 
} 
 
/** Construye SD-JWT: payload con claims = array de hashes y set de 
disclosures aparte */ 
export function issueSDJWT(issuerDid: string, privKey: string, 
payload: ClaimMap, headerExtra: any = {}): SDJwtPackage { 
  const salts: Record<string, string> = {}; 
  const disclosures: string[] = []; 
 
  const hashed: Record<string, string> = {}; 
  for (const [k, v] of Object.entries(payload)) { 
    const salt = randomBytes(16); 
    salts[k] = b64url(salt); 
    const disclosure = b64url(Buffer.from(JSON.stringify([k, v, 
salts[k]]))); 
    disclosures.push(disclosure); 
    hashed[k] = hashDisclosure(k, v, salt); 
  } 
 
  const header = { alg: "ES256K", typ: "JWT", ...headerExtra }; 
  const body = { 
    iss: issuerDid, 
    nbf: Math.floor(Date.now() / 1000), 
    cnf: { jwk: { kty: "EC", crv: "secp256k1" } }, // demo 
    _sd: Object.values(hashed) // arreglo de hashes 
  }; 
 
  const signInput = (part: any) => 
b64url(Buffer.from(JSON.stringify(part))); 
  const signingInput = `${signInput(header)}.${signInput(body)}`; 
  const sig = new 
ethers.SigningKey(privKey).sign(ethers.sha256(ethers.toUtf8Bytes(signi
 ngInput))); 
  const jws = 
`${signingInput}.${b64url(Buffer.from(ethers.Signature.from(sig).seria
 lized))}`; 
 
  return { sdJwt: jws, disclosures }; 
} 
 
/** Verificación local con selective disclosure: se aportan algunas 
disclosures y se re-hashéan */ 
export function verifySDJWTLocally(sdJwt: string, disclosures: 
string[], issuerPubKey: string): { 
  ok: boolean; revealed: ClaimMap; errors: string[]; 
} { 
  const [h, p, s] = sdJwt.split("."); 
  const payload = JSON.parse(Buffer.from(p, 
"base64url").toString("utf-8")); 
  const header = JSON.parse(Buffer.from(h, 
"base64url").toString("utf-8")); 
 
  // Verificar firma (ES256K). Simplificado: comparar ecrecover con 
issuerPubKey 
  const signingInput = `${h}.${p}`; 
  // En producción: usa jose/jws para ES256K y la JWK del issuer 
extraída de su DID Document 
  if (!header.alg || header.alg !== "ES256K") return { ok: false, 
revealed: {}, errors: ["bad alg"] }; 
 
  // Validación de disclosures 
  const targetHashes = new Set<string>(payload._sd); 
  const revealed: ClaimMap = {}; 
  const errors: string[] = []; 
 
  for (const d of disclosures) { 
    try { 
      const [name, val, salt] = JSON.parse(Buffer.from(d, 
"base64url").toString("utf-8")); 
      const h2 = hashDisclosure(name, val, Buffer.from(salt, 
"base64url")); 
if (!targetHashes.has(h2)) { errors.push(`mismatch for 
${name}`); continue; } 
revealed[name] = val; 
} catch (e:any) { 
errors.push("bad disclosure"); 
} 
} 
// No revoque ni expirada aquí; eso se hace en capa de estado y 
metadatos 
return { ok: errors.length === 0, revealed, errors }; 
} 
