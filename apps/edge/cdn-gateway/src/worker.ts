
export interface Env {
  ORIGIN_URL: string;
  REQUIRE_SIGNED: string; // "1" | "0"
  SIGNING_KEYS_JSON: string; // {"kid":"base64urlKey",...}
  ADMIN_TOKEN: string;
  CDN_META: KVNamespace;
}

type RouteHandler = (req: Request, env: Env, ctx: ExecutionContext) => Promise<Response>;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Simple router
    const routes: Array<[RegExp, RouteHandler]> = [
      [/^\/edge\/health$/, health],
      [/^\/edge\/image$/, image],
      [/^\/edge\/proxy\/(.*)$/, proxy],
      [/^\/edge\/purge$/, purgeTag],
      [/^\/edge\/ab$/, ab],
      [/^\/edge\/geo-block$/, geoBlock]
    ];

    for (const [re, handler] of routes) {
      const m = path.match(re);
      if (m) {
        (req as any).params = m.slice(1);
        return handler(req, env, ctx);
      }
    }
    return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
      status: 404,
      headers: cors({ "content-type": "application/json" })
    });
  }
} satisfies ExportedHandler<Env>;

// --- Handlers ---

const health: RouteHandler = async (_req) =>
  new Response(JSON.stringify({ ok: true }), {
    headers: cors({ "content-type": "application/json" })
  });

const image: RouteHandler = async (req) => {
  const u = new URL(req.url);
  const src = u.searchParams.get("url");
  if (!src) return json({ ok: false, error: "url_required" }, 400);
  const w = toInt(u.searchParams.get("w"));
  const h = toInt(u.searchParams.get("h"));
  const q = toInt(u.searchParams.get("q")) || 75;

  const cf: RequestInitCfProperties = {
    image: {
      width: w || undefined,
      height: h || undefined,
      quality: q,
      fit: "cover"
    }
  };

  const r = await fetch(src, { cf } as any);
  // Propaga cache headers del origen
  return new Response(r.body, { headers: cors(copyHeaders(r.headers)) });
};

const proxy: RouteHandler = async (req, env) => {
  const u = new URL(req.url);
  const rest = (req as any).params?.[0] || "";
  const origin = new URL(env.ORIGIN_URL.replace(/\/+$/, "") + "/" + rest.replace(/^\/+/, ""));
  // Copiar query excepto params del CDN
  u.searchParams.forEach((v, k) => {
    if (!["sig", "exp", "key", "tag", "_"].includes(k)) origin.searchParams.set(k, v);
  });

  if (env.REQUIRE_SIGNED === "1") {
    const ok = await verifySignedURL(u, env);
    if (!ok) return json({ ok: false, error: "invalid_signature" }, 403);
  }

  // Tag para soft‑purge (query ?tag=... o header x-cache-tag)
  const tag = u.searchParams.get("tag") || req.headers.get("x-cache-tag") || undefined;
  const version = tag ? (await getTagVersion(tag, env)) : null;
  const cacheKey = buildCacheKey(u, version ? `v=${version}` : "");

  const cf: RequestInitCfProperties = {
    cacheEverything: true,
    cacheKey,
    // TTL por estado (honrará s-maxage si presente)
    cacheTtlByStatus: { "200-299": 3600, "300-399": 60, "400-499": 120, "500-599": 10 }
  };

  // Forward request as GET only for caching (if original was GET/HEAD)
  const method = req.method === "HEAD" ? "HEAD" : "GET";
  const headers = new Headers(req.headers);
  headers.delete("cookie"); // evitar cache por cookie
  headers.set("x-edge-cache-tag", tag ?? "");

  const upstream = await fetch(origin.toString(), { method, headers, cf } as any);

  // Añadimos SWR si no existe para permitir servir stale
  const respHeaders = copyHeaders(upstream.headers);
  if (!respHeaders["cache-control"]) {
    respHeaders["cache-control"] = "public, max-age=3600, stale-while-revalidate=600";
  }
  respHeaders["x-cache-tag"] = tag ?? "";
  if (version) respHeaders["x-cache-tag-version"] = String(version);
  respHeaders["x-cdn-cache-key"] = cacheKey;

  return new Response(upstream.body, { status: upstream.status, headers: cors(respHeaders) });
};

const purgeTag: RouteHandler = async (req, env) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (req.headers.get("x-admin-token") !== env.ADMIN_TOKEN) return json({ ok: false, error: "forbidden" }, 403);
  const u = new URL(req.url);
  const tag = u.searchParams.get("tag");
  if (!tag) return json({ ok: false, error: "tag_required" }, 400);
  const newV = await bumpTagVersion(tag, env);
  return json({ ok: true, tag, version: newV });
};

const ab: RouteHandler = async (req) => {
  const u = new URL(req.url);
  const exp = u.searchParams.get("exp") || "default";
  const id = getClientId(req);
  const bucket = hashToAB(`${exp}:${id}`);
  return new Response(JSON.stringify({ ok: true, exp, bucket }), {
    headers: cors({
      "content-type": "application/json",
      "set-cookie": `exp:${exp}=${bucket}; Path=/; Max-Age=2592000; SameSite=Lax`
    })
  });
};

const geoBlock: RouteHandler = async (req) => {
  const u = new URL(req.url);
  const block = (u.searchParams.get("block") || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const allow = (u.searchParams.get("allow") || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const country = (req as any).cf?.country as string | undefined;

  if (allow.length && country && !allow.includes(country)) {
    return json({ ok: false, error: "geo_denied", country }, 403);
  }
  if (block.length && country && block.includes(country)) {
    return json({ ok: false, error: "geo_blocked", country }, 403);
  }
  return json({ ok: true, country });
};

// --- helpers ---

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors({ "content-type": "application/json" }) });
}

function cors(h: Record<string, string>) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*,authorization,content-type,x-admin-token",
