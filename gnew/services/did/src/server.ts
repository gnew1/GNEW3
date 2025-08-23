import express from "express"; 
import { ethers } from "ethers"; 
import { keccak256 } from "ethers"; 
import { createGnewDID, createKeyDID, createPKHDID, DidDocument, 
hashDidDocument } from "./utils"; 
import { anchorOnChain, fetchDoc, putDoc } from "./storage"; 
import { resolveDid } from "./resolver"; 
import rateLimit from "express-rate-limit"; 
 
const app = express(); 
app.use(express.json({ limit: "512kb" })); 
app.use(rateLimit({ windowMs: 60_000, max: 120 })); 
 
/** 
 * POST /v1/dids 
 * body: { method: "gnew"|"key"|"pkh", controllerPrivKey?, chainId?, 
services?: [], alsoAnchor?: true, storage?: "ipfs"|"ceramic"|"inline" 
} 
 */ 
app.post("/v1/dids", async (req, res) => { 
  try { 
    const { method, controllerPrivKey, chainId, services, alsoAnchor = 
true, storage = "ipfs" } = req.body; 
    if (!["gnew", "key", "pkh"].includes(method)) return 
res.status(400).json({ error: "unsupported method" }); 
 
    let did: string; 
    let doc: DidDocument; 
 
    if (method === "gnew") { 
      if (!controllerPrivKey || !chainId) return 
res.status(400).json({ error: "controllerPrivKey and chainId required" 
}); 
      const wallet = new ethers.Wallet(controllerPrivKey); 
      ({ did, doc } = await createGnewDID(wallet.address, 
Number(chainId), services || [])); 
    } else if (method === "key") { 
      ({ did, doc } = await createKeyDID(services || [])); 
    } else { 
      if (!controllerPrivKey || !chainId) return 
res.status(400).json({ error: "controllerPrivKey and chainId required" 
}); 
      const wallet = new ethers.Wallet(controllerPrivKey); 
      ({ did, doc } = await createPKHDID(wallet.address, 
Number(chainId), services || [])); 
    } 
 
    // Persist document (IPFS/Ceramic) and compute hash 
    const docURI = await putDoc(doc, storage);      // e.g. ipfs://CID 
or ceramic://streamId 
    const contentHash = hashDidDocument(doc);       // bytes32 digest 
(hex) 
 
    // Optional on-chain anchoring (recommended) 
    if (alsoAnchor) { 
      const anchorTx = await anchorOnChain({ 
        did, 
        docURI, 
        contentHash 
      }); 
      return res.json({ did, doc, docURI, contentHash, anchorTx }); 
    } 
 
    return res.json({ did, doc, docURI, contentHash }); 
  } catch (e: any) { 
    console.error(e); 
    return res.status(500).json({ error: e.message }); 
  } 
}); 
 
/** 
 * GET /v1/dids/:did 
 * - Resolve DID: pull anchor, fetch document, verify digest 
 */ 
app.get("/v1/dids/:did", async (req, res) => { 
  try { 
    const { did } = req.params; 
    const resolution = await resolveDid(did); 
    return res.json(resolution); 
  } catch (e: any) { 
    return res.status(404).json({ error: e.message }); 
  } 
}); 
 
/** 
 * PATCH /v1/dids/:did 
 * ops: { setServices?: ServiceEndpoint[], rotateControllerTo?: 
"eip155:<chainId>:<address>", storage?: "ipfs"|"ceramic" } 
 * requires controller signer via Authorization: Bearer <privKey> 
(demo) 
 */ 
app.patch("/v1/dids/:did", async (req, res) => { 
  try { 
    const { did } = req.params; 
    const { setServices, rotateControllerTo, storage = "ipfs" } = 
req.body; 
    const controllerPrivKey = (req.headers.authorization || 
"").replace("Bearer ", ""); 
    if (!controllerPrivKey) return res.status(401).json({ error: 
"controller key required" }); 
 
    // Load current doc via resolver 
    const resolved = await resolveDid(did); 
    if (resolved.deactivated) return res.status(400).json({ error: 
"did revoked" }); 
    const doc = resolved.didDocument as DidDocument; 
 
    // Update services 
    if (Array.isArray(setServices)) { 
      doc.service = setServices; 
    } 
 
    // Rotate controller (for did:gnew/pkh) 
    if (rotateControllerTo) { 
      const [_, method] = did.split(":"); // did:gnew:... 
      if (method !== "gnew" && method !== "pkh") { 
        return res.status(400).json({ error: "controller rotation not 
supported for this method" }); 
      } 
      doc.controller = `did:pkh:${rotateControllerTo}`; 
    } 
 
    // Persist new doc and re-anchor 
    const newURI = await putDoc(doc, storage); 
    const newHash = hashDidDocument(doc); 
    const anchorTx = await anchorOnChain({ did, docURI: newURI, 
contentHash: newHash, update: true }); 
    return res.json({ did, doc, docURI: newURI, contentHash: newHash, 
anchorTx }); 
  } catch (e: any) { 
    return res.status(500).json({ error: e.message }); 
  } 
}); 
 
/** 
 * DELETE /v1/dids/:did  (deactivate) 
 * Authorization: Bearer <controllerPrivKey> 
 */ 
app.delete("/v1/dids/:did", async (req, res) => { 
  try { 
    const { did } = req.params; 
    const controllerPrivKey = (req.headers.authorization || 
"").replace("Bearer ", ""); 
    if (!controllerPrivKey) return res.status(401).json({ error: 
"controller key required" }); 
    const anchorTx = await anchorOnChain({ did, revoke: true }); 
    return res.json({ did, anchorTx, deactivated: true }); 
  } catch (e: any) { 
    return res.status(500).json({ error: e.message }); 
  } 
}); 
 
const PORT = parseInt(process.env.PORT || "8081", 10); 
app.listen(PORT, () => console.log(`DID service listening on 
:${PORT}`)); 
 
 
