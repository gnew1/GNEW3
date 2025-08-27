
import { db } from "./db.js";
import { sha256Hex } from "./hash.js";
import { enabledBackends, Backend, cfg } from "./config.js";
import { writeAudit } from "./audit.js";
import { nanoid } from "nanoid";
import { ipfsAdd, ipfsPin, ipfsStat } from "./drivers/ipfs.js";
import { w3sUpload, w3sStatus } from "./drivers/web3storage.js";
import { bundlrUpload, bundlrStatus } from "./drivers/bundlr.js";
import { ipfsGateways, arweaveGateways } from "./gateways.js";

export type ReplicationResult = Record<Backend, { ok: boolean; id?: string; error?: string }>;

export async function replicateContent(content: Buffer | string, filename?: string): Promise<{ hash: string; results: ReplicationResult }> {
  const hash = sha256Hex(content);
  const results: ReplicationResult = {} as ReplicationResult;

  // Try each enabled backend
  for (const backend of enabledBackends) {
    try {
      switch (backend) {
        case "ipfs":
          const ipfsResult = await ipfsAdd(content, filename);
          await ipfsPin(ipfsResult.cid);
          results[backend] = { ok: true, id: ipfsResult.cid };
          break;
          
        case "web3storage":
          const w3sId = await w3sUpload(content, filename || "file");
          results[backend] = { ok: true, id: w3sId };
          break;
          
        case "bundlr":
          const bundlrId = await bundlrUpload(content);
          results[backend] = { ok: true, id: bundlrId };
          break;
          
        default:
          results[backend] = { ok: false, error: "Unknown backend" };
      }
    } catch (error) {
      results[backend] = { ok: false, error: (error as Error).message };
    }
  }

  // Store in database
  const pinId = nanoid();
  db.prepare(`
    INSERT INTO pins (id, hash, backends, created_at, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(pinId, hash, JSON.stringify(results), Date.now(), "completed");

  // Write audit log
  await writeAudit("REPLICATE", { hash, backends: enabledBackends.length, success: Object.values(results).filter(r => r.ok).length });

  return { hash, results };
}

export async function getReplicationStatus(hash: string): Promise<{ hash: string; backends: ReplicationResult } | null> {
  const pin = db.prepare("SELECT backends FROM pins WHERE hash = ?").get(hash) as any;
  if (!pin) return null;
  
  return {
    hash,
    backends: JSON.parse(pin.backends)
  };
}

