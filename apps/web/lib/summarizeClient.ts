export type SummarizePayload = { 
  conversationId?: string; 
  messages: Array<{ id: string; author?: string; role?: string; text: 
string; ts?: number }>; 
  limit?: number; 
  lang?: "es" | "en"; 
}; 
 
export async function callSummarize(payload: SummarizePayload) { 
  // Proxy en Next.js API para evitar CORS si hace falta 
  const res = await fetch("/api/summarize", { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(payload), 
  }); 
  if (!res.ok) throw new Error(`Summarize failed: ${res.status}`); 
  return (await res.json()) as { 
    tldr: string[]; 
    suggestions: Array<{ type: string; title: string; reason: string; 
cta?: string }>; 
    confidence: number; 
    cache: { hit: boolean; ttl_s: number }; 
    perf_ms: number; 
    meta: { key: string; items: number; lang: "es" | "en" }; 
  }; 
} 
 
/apps/web/app/api/summarize/route.ts (Next.js 13+/App Router — proxy al gateway) 
import { NextRequest, NextResponse } from "next/server"; 
 
const GATEWAY_URL = process.env.GATEWAY_URL || 
"http://localhost:4000"; 
 
export async function POST(req: NextRequest) { 
  const body = await req.json(); 
  const r = await fetch(`${GATEWAY_URL}/summarize`, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(body), 
    // revalidate caché a nivel de edge si usas Next 14/15 
    next: { revalidate: 120 }, 
  }); 
  const data = await r.text(); 
  return new NextResponse(data, { 
    status: r.status, 
    headers: { "Content-Type": r.headers.get("Content-Type") || 
"application/json" }, 
  }); 
} 
 
