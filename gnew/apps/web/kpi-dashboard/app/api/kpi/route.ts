import { NextRequest, NextResponse } from "next/server";
import { getOrSet } from "../../../lib/cache";
import { buildSynthetic } from "../../../lib/synthetic";

// TTL configurables
const TTL = parseInt(process.env.KPI_TTL_SECONDS || "60", 10);
const SMAX = parseInt(process.env.KPI_SMAXAGE || "120", 10);

// (opcional) aquí puedes conectar fuentes reales (N41, servicios N42–N46)
// const N41_BASE = process.env.N41_BASE;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const chain = url.searchParams.get("chain") || "eth";
  const network = url.searchParams.get("network") || "mainnet";
  const token = url.searchParams.get("token") || "GNEW";
  const range = url.searchParams.get("range") || "30d";

  const cacheKey = `kpi:${chain}:${network}:${token}:${range}`;

  const t0 = Date.now();
  const data = await getOrSet(cacheKey, TTL, async () => {
    // TODO: reemplazar por agregación real (fetch al lake/API).
    // Debe devolver el shape del objeto "data" de abajo.
    return buildSynthetic({ chain, network, token, range });
  });
  const t1 = Date.now();

  const res = NextResponse.json({ ...data, _meta: { latency_ms: t1 - t0, cached: t1 - t0 < 10 } });
  // Cache-Control para CDN/proxy (stale-while-revalidate-like)
  res.headers.set("Cache-Control", `public, s-maxage=${SMAX}, max-age=${SMAX}`);
  return res;
}

