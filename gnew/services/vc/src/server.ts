import express from "express"; 
import rateLimit from "express-rate-limit"; 
import { issueSDJWT, verifySDJWTLocally } from "./sdjwt"; 
import { issueBbsCredential, createBbsPresentation, 
verifyBbsPresentationLocally } from "./bbs"; 
import { publishStatusList, makeEmptyBitstring, setBit, getBit } from 
"./status"; 
import { resolveDid } from "../../did/src/resolver"; // reusar N121 
import Ajv from "ajv"; 
import { GnewRoleSchemaV1, GnewAchievementSchemaV1 } from "./schemas"; 
const app = express(); 
app.use(express.json({ limit: "1mb" })); 
app.use(rateLimit({ windowMs: 60_000, max: 120 })); 
const ajv = new Ajv({ allErrors: true }); 
const roleValidate = ajv.compile(GnewRoleSchemaV1); 
const achValidate = ajv.compile(GnewAchievementSchemaV1); 
 
// --- Estado en memoria (demo) --- 
const statusBitstrings: Record<string, Uint8Array> = {}; // key: 
listName 
const allocations: Record<string, number[]> = {};         // DID 
holder -> índices emitidos 
 
// Inicializa lista por defecto (roles) 
statusBitstrings["roles"] = makeEmptyBitstring(8192); 
 
// ---- Emisión ---- 
app.post("/v1/vc/issue", async (req, res) => { 
  try { 
    const { type, method, issuerDid, issuerPrivKey, subjectDid, 
claims, listName = "roles" } = req.body as { 
      type: "role" | "achievement"; 
      method: "sd-jwt" | "bbs"; 
      issuerDid: string; 
      issuerPrivKey: string; 
      subjectDid: string; 
      claims: any; 
      listName?: string; 
    }; 
 
    // asigna índice libre en status list 
    const bitset = statusBitstrings[listName] || 
makeEmptyBitstring(8192); 
    let index = -1; 
    for (let i = 0; i < bitset.length * 8; i++) { if (!getBit(bitset, 
i)) { index = i; break; } } 
    if (index < 0) return res.status(507).json({ error: "status list 
full" }); 
    setBit(bitset, index, false); // false = válido 
    statusBitstrings[listName] = bitset; 
 
    // Construye VC base 
    const now = new Date().toISOString(); 
    const base = { 
      "@context": ["https://www.w3.org/2018/credentials/v1"], 
      type: [type === "role" ? "GnewRoleCredential" : 
"GnewAchievementCredential", "VerifiableCredential"], 
      issuer: issuerDid, 
      issuanceDate: now, 
      credentialSubject: { id: subjectDid, ...claims }, 
      credentialStatus: { 
        id: `status:${listName}#${index}`, 
        type: "StatusListEntry", 
        statusListIndex: String(index), 
        statusListURI: `status:${listName}` // se sustituye por 
ipfs:// después de publicar 
      }, 
      termsOfUse: [{ type: "GnewToU", uri: 
"https://tos.gnew.example/v1" }] 
    }; 
 
    // Validación de esquema 
    const ok = (type === "role" ? roleValidate(base) : 
achValidate(base)); 
    if (!ok) return res.status(400).json({ error: "schema", details: 
(type === "role" ? roleValidate.errors : achValidate.errors) }); 
 
    // Publica/actualiza status list a IPFS y ancla (batch por request 
demo) 
    const { uri, contentHash } = await publishStatusList(listName, 
bitset, "revocation"); 
    base.credentialStatus.statusListURI = uri; 
 
    if (method === "sd-jwt") { 
      const { sdJwt, disclosures } = issueSDJWT(issuerDid, 
issuerPrivKey, base); 
      // Paquete para holder: sd-jwt + disclosures + metadatos 
      return res.json({ format: "sd-jwt", sdJwt, disclosures, 
statusListURI: uri, statusListIndex: index, contentHash }); 
    } else { 
      const signed = issueBbsCredential(issuerDid, { publicKey: new 
Uint8Array(), secretKey: new Uint8Array() }, base); 
      return res.json({ format: "bbs", credential: signed, 
statusListURI: uri, statusListIndex: index, contentHash }); 
    } 
  } catch (e:any) { 
    return res.status(500).json({ error: e.message }); 
  } 
}); 
 
// ---- Presentación / Verificación local ---- 
app.post("/v1/vp/verify", async (req, res) => { 
  try { 
    const { format } = req.body as { format: "sd-jwt" | "bbs"; [k: 
string]: any }; 
 
    // Resolver clave pública del issuer desde DID Registry (N121), 
luego verificación local 
    const issuerDid: string = req.body.issuerDid; 
    const resolvedIssuer = await resolveDid(issuerDid); 
    if (!resolvedIssuer.didDocument) return res.status(400).json({ 
error: "issuer DID not resolved" }); 
    // En producción: extraer JWK/clave verificación apropiada del DID 
Doc 
    const issuerPubKey = "0xISSUER_PUBKEY"; 
 
    // Revocation check local (se espera statusList y hash en 
request.cache) 
    const cache = req.body.cache as { statusListURI: string; 
encodedList: string; contentHash: string }; 
    const localListHash = 
require("crypto").createHash("sha3-256").update( 
      JSON.stringify({ 
        "@context": ["https://www.w3.org/2018/credentials/v1"], 
        "type": ["StatusList"], 
        "purpose": "revocation", 
        "size": Buffer.from(cache.encodedList, "base64url").length * 
8, 
        "encodedList": cache.encodedList 
      }) 
    ).digest("hex"); 
    if (!("0x" + localListHash.slice(-64) === cache.contentHash)) { 
      return res.status(400).json({ error: "status list hash mismatch 
(offline cache invalid)" }); 
    } 
 
    if (format === "sd-jwt") { 
      const { sdJwt, disclosures, statusListIndex } = req.body; 
      const result = verifySDJWTLocally(sdJwt, disclosures, 
issuerPubKey); 
      const bit = getBit(Buffer.from(cache.encodedList, "base64url"), 
Number(statusListIndex)); 
      return res.json({ ok: result.ok && !bit, revealed: 
result.revealed, revoked: bit, errors: result.errors }); 
    } else { 
      const { presentation, statusListIndex } = req.body; 
      const result = verifyBbsPresentationLocally({ presentation }, 
new Uint8Array()); 
      const bit = getBit(Buffer.from(cache.encodedList, "base64url"), 
Number(statusListIndex)); 
      return res.json({ ok: result.ok && !bit, revealed: 
result.revealed, revoked: bit, errors: result.errors }); 
    } 
  } catch (e:any) { 
    return res.status(500).json({ error: e.message }); 
  } 
}); 
 
// ---- Revocación ---- 
app.post("/v1/status/revoke", async (req, res) => { 
  try { 
    const { listName = "roles", index } = req.body as { listName?: 
string; index: number }; 
    const bitset = statusBitstrings[listName] || 
makeEmptyBitstring(8192); 
    setBit(bitset, index, true); // true = revocado 
    statusBitstrings[listName] = bitset; 
    const { uri, contentHash } = await publishStatusList(listName, 
bitset, "revocation"); 
    return res.json({ ok: true, statusListURI: uri, contentHash }); 
  } catch (e:any) { 
    return res.status(500).json({ error: e.message }); 
  } 
}); 
 
const PORT = parseInt(process.env.PORT || "8082", 10); 
app.listen(PORT, () => console.log(`VC service listening on 
:${PORT}`)); 
 
 
