
import crypto from "node:crypto";
import { cfg } from "../config.js";

/**
 * Upload mínimo a Bundlr:
 *  - Construye un DataItem sin tags y firma (RSA/P-256) con clave de `BUNDLR_PRIVATE_KEY`.
 *  - No cubre arweave nativo (usa bundlr node compatible), retorno txId (equivale a "cid").
 *  - Para producción se recomienda SDK oficial; aquí implementamos una vía ligera.
 */
export async function bundlrUpload(bytes: Uint8Array): Promise<{ txId: string; size: number }> {
  if (!cfg.bundlr.url || !cfg.bundlr.privateKey || !cfg.bundlr.currency) throw new Error("bundlr_not_configured");

  // Muy simplificado: Bundlr soporta endpoint /tx para DataItem firmado (Binary). Usamos JWS compact.
  // Este stub usa digest + firma RSA/EC de contenido crudo y lo manda como binary envelope.
  const keyPem = cfg.bundlr.privateKey!;
  const alg = keyPem.includes("BEGIN RSA") ? "RSA-SHA256" : "SHA256";
  const digest = crypto.createHash("sha256").update(bytes).digest();
  const signature = crypto.sign(alg, digest, keyPem);
  const payload = new Blob([bytes, signature]); // NOTA: contrato de wire simplificado para demo

  const r = await fetch(`${cfg.bundlr.url}/tx/${cfg.bundlr.currency}`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: payload
  } as any);
  if (!r.ok) throw new Error(`bundlr_http_${r.status}`);
  const j = await r.json();
  return { txId: j.id, size: bytes.byteLength };
}

export async function bundlrStatus(txId: string): Promise<{ stored: boolean }> {
  if (!cfg.bundlr.url) return { stored: false };
  const r = await fetch(`${cfg.bundlr.url}/tx/status/${txId}`);
  if (!r.ok) return { stored: false };
  const j = await r.json();
  return { stored: j?.status === "confirmed" || j?.status === "uploaded" };
}


