
import { cfg } from "../config.js";

export async function w3sUpload(bytes: Uint8Array): Promise<{ cid: string; size: number }> {
  if (!cfg.w3sToken) throw new Error("w3s_not_configured");
  const r = await fetch("https://api.web3.storage/upload", {
    method: "POST",
    headers: { "Authorization": `Bearer ${cfg.w3sToken}` },
    body: new Blob([bytes])
  } as any);
  if (!r.ok) throw new Error(`w3s_http_${r.status}`);
  const j = await r.json();
  return { cid: j.cid, size: bytes.byteLength };
}

export async function w3sStatus(cid: string): Promise<{ stored: boolean }> {
  if (!cfg.w3sToken) return { stored: false };
  const r = await fetch(`https://api.web3.storage/status/${cid}`, {
    headers: { "Authorization": `Bearer ${cfg.w3sToken}` }
  });
  if (!r.ok) return { stored: false };
  const j = await r.json();
  return { stored: !!j?.dagSize };
}


