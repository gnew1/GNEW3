  };
}

function toInt(x: string | null): number | undefined {
  const n = x ? Number(x) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function copyHeaders(h: Headers) {
  const out: Record<string, string> = {};
  h.forEach((v, k) => (out[k.toLowerCase()] = v));
  return out;
}

async function verifySignedURL(u: URL, env: Env) {
  const exp = Number(u.searchParams.get("exp") || 0);
  const sig = u.searchParams.get("sig") || "";
  const kid = u.searchParams.get("key") || "";

  if (!exp || !sig || !kid) return false;
  if (Date.now() / 1000 > exp) return false;

  let keys: Record<string, string>;
  try {
    keys = JSON.parse(env.SIGNING_KEYS_JSON || "{}");
  } catch {
    return false;
  }
  const b64key = keys[kid];
  if (!b64key) return false;

  const key = base64urlDecode(b64key);
  // firma sobre "METHOD|PATH?QUERY_SIN_SIG&exp=..&key=..|exp"
  const baseUrl = new URL(u.toString());
  baseUrl.searchParams.delete("sig");
  const msg = `${"GET"}|${baseUrl.pathname}${baseUrl.search}|${exp}`;
  const mac = await hmacSHA256(key, msg);
  return timingSafeEqual(sig, base64url(mac));
}

function base64url(buf: ArrayBuffer | Uint8Array) {
  let b = typeof buf === "string" ? buf : Buffer.from(buf as any).toString("base64");
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function base64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  const b64 = s + "=".repeat(pad);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function hmacSHA256(key: Uint8Array, msg: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
}

function timingSafeEqual(a: string, b: string) {
  const A = new Uint8Array(Buffer.from(a));
  const B = new Uint8Array(Buffer.from(b));
  if (A.length !== B.length) return false;
  let out = 0;
  for (let i = 0; i < A.length; i++) out |= A[i] ^ B[i];
  return out === 0;
}

function buildCacheKey(u: URL, suffix: string) {
  return suffix ? `${u.origin}${u.pathname}${u.search}&${suffix}` : `${u.origin}${u.pathname}${u.search}`;
}

async function getTagVersion(tag: string, env: Env) {
  const k = `tag:v:${tag}`;
  const v = await env.CDN_META.get(k);
  if (!v) {
    await env.CDN_META.put(k, "1");
    return 1;
    }
  return Number(v) || 1;
}

async function bumpTagVersion(tag: string, env: Env) {
  const cur = await getTagVersion(tag, env);
  const next = cur + 1;
  await env.CDN_META.put(`tag:v:${tag}`, String(next));
  return next;
}

function getClientId(req: Request): string {
  const c = req.headers.get("cookie") || "";
  const m = c.match(/cid=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  const id = base64url(crypto.getRandomValues(new Uint8Array(16)));
  // Note: no podemos setear cookie aquí (no tenemos Response aún); el handler /edge/ab la establece.
  return id;
}

function hashToAB(s: string) {
  // djb2
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return (h >>> 0) % 2 === 0 ? "A" : "B";
}


