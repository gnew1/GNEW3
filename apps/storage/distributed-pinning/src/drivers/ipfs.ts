
import { cfg } from "../config.js";

async function ipfsCmd(cmd: string, params: Record<string, string | number | boolean> = {}, body?: any, contentType?: string) {
  if (!cfg.ipfsApiUrl) throw new Error("ipfs_not_configured");
  const url = new URL(cmd, cfg.ipfsApiUrl.endsWith("/") ? cfg.ipfsApiUrl : cfg.ipfsApiUrl + "/");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const r = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body
  } as any);
  if (!r.ok) throw new Error(`ipfs_http_${r.status}`);
  return r;
}

export async function ipfsAdd(bytes: Uint8Array): Promise<{ cid: string; size: number }> {
  // Minimal multipart to /api/v0/add
  const boundary = "----gnew-ipfs-" + Math.random().toString(36).slice(2);
  const head = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="blob"\r\nContent-Type: application/octet-stream\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const body = new Blob([head, bytes, tail]);
  const r = await ipfsCmd("add", { pin: true, cidVersion: 1, rawLeaves: true, progress: false }, body, `multipart/form-data; boundary=${boundary}`);
  const j = await r.json();
  return { cid: j.Hash, size: Number(j.Size) || bytes.byteLength };
}

export async function ipfsPin(cid: string): Promise<{ ok: boolean }> {
  await ipfsCmd("pin/add", { arg: cid });
  return { ok: true };
}

export async function ipfsStat(cid: string): Promise<{ pinned: boolean; size?: number }> {
  try {
    const r = await ipfsCmd("pin/ls", { arg: cid });
    const j = await r.json();
    const pinned = !!j.Keys?.[cid];
    return { pinned };
  } catch {
    return { pinned: false };
  }
}


