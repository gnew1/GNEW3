import React, { useMemo } from "react"; 
import useSWR from "swr"; 
import { Button } from "@repo/ui/button"; 
import { Card } from "@repo/ui/card"; 
import { LineChart } from "@repo/ui/LineChart"; 
const API_URL = process.env.NEXT_PUBLIC_METRICS_API || 
"http://localhost:8007"; 
const fetcher = (url: string) => fetch(url).then((r) => r.json()); 
function number(n: number | undefined) { 
return typeof n === "number" ? n.toLocaleString() : "-"; 
} 
export default function MetricsPage() { 
const { data, isLoading } = useSWR(`${API_URL}/metrics/summary`, 
fetcher, { 
refreshInterval: 10_000, // DoD: refresh ≤ 10 s 
}); 
const series = useMemo(() => { 
// Tiny synthetic time series for the LineChart using current 
snapshot 
const now = Date.now(); 
const pts = Array.from({ length: 8 }).map((_, i) => ({ 
x: new Date(now - (7 - i) * 60_000).toISOString(), 
      y: (data?.participation?.posts || 0) * (0.9 + Math.random() * 
0.2), 
    })); 
    return [{ id: "posts", data: pts }]; 
  }, [data]); 
 
  const download = (kind: string) => { 
    const url = `${API_URL}/metrics/${kind}?format=csv`; 
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = `${kind}.csv`; 
    a.click(); 
  }; 
 
  if (isLoading) return <div style={{ padding: 16 }}>Cargando 
métricas…</div>; 
 
  const p = data?.participation; 
  const t = data?.times; 
  const d = data?.delegation; 
 
  return ( 
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}> 
      <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: 28, 
marginBottom: 12 }}> 
        Dashboard · Métricas Clave 
      </h1> 
 
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: 
"repeat(auto-fit,minmax(260px,1fr))" }}> 
        <Card title="Participación"> 
          <ul style={{ lineHeight: 1.8 }}> 
            <li>Usuarios activos: 
<b>{number(p?.active_users)}</b></li> 
            <li>Posts: <b>{number(p?.posts)}</b></li> 
            <li>Votos: <b>{number(p?.votes)}</b></li> 
          </ul> 
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}> 
            <Button onClick={() => download("participation")}>Exportar 
CSV</Button> 
          </div> 
        </Card> 
 
        <Card title="Tiempos (respuesta)"> 
          <ul style={{ lineHeight: 1.8 }}> 
            <li>Promedio 1ª respuesta: 
<b>{number(t?.avg_first_response_seconds)}s</b></li> 
            <li>P50: <b>{number(t?.p50_seconds)}s</b></li> 
            <li>P90: <b>{number(t?.p90_seconds)}s</b></li> 
          </ul> 
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}> 
            <Button onClick={() => download("times")}>Exportar 
CSV</Button> 
          </div> 
        </Card> 
 
        <Card title="Delegación"> 
          <ul style={{ lineHeight: 1.8 }}> 
            <li>Delegaciones activas: 
<b>{number(d?.active_delegations)}</b></li> 
            <li>Top delegados: <b>{(d?.top_delegates?.[0]?.user ?? 
"–")}</b></li> 
          </ul> 
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}> 
            <Button onClick={() => download("delegation")}>Exportar 
CSV</Button> 
          </div> 
        </Card> 
      </div> 
 
      <Card title="Tendencia de publicaciones (mock de ejemplo)"> 
        <LineChart 
          data={series} 
          xKey="x" 
          yKey="y" 
          height={280} 
          aria-label="Tendencia de posts" 
        /> 
      </Card> 
 
      <div style={{ marginTop: 8 }}> 
        <Button onClick={() => download("summary")}>Exportar CSV 
(Resumen)</Button> 
      </div> 
 
      <p style={{ marginTop: 8, color: "#6b7280" }}> 
        Actualizado: {new Date(data?.generated_at || 
Date.now()).toLocaleString()} 
      </p> 
    </div> 
  ); 
} 
 
 
Ruta completa: ./apps/web/next.config.js (añadir variable pública si no existe) 
/** @type {import('next').NextConfig} */ 
const nextConfig = { 
  reactStrictMode: true, 
  env: { 
    NEXT_PUBLIC_METRICS_API: process.env.NEXT_PUBLIC_METRICS_API || 
"http://localhost:8007" 
  } 
}; 
module.exports = nextConfig; 
 
 
Ruta completa: ./infra/compose/docker-compose.override.yml (snippet opcional para 
levantar el servicio) 
version: "3.9" 
services: 
  metrics: 
    build: 
      context: ../../ 
      dockerfile: services/metrics/Dockerfile 
    environment: 
      DATABASE_URL: sqlite:///./metrics.db 
      ENVIRONMENT: development 
      CACHE_TTL_SECONDS: 10 
    ports: 
      - "8007:8000" 
    healthcheck: 
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"] 
      interval: 30s 
      timeout: 3s 
      retries: 3 
 
 
