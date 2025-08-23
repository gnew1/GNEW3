export default function Home() {
  return (
    <main className="container">
      <div className="card">
        <h1 style={{margin:0}}>GNEW KPI Dashboard</h1>
        <p>Ir al panel → <a href="/kpi">/kpi</a></p>
      </div>
    </main>
  );
}

 
Cómo se garantiza la latencia < 5 s
1.	Caché en memoria (LRU + TTL) en /api/kpi (lib/cache.ts).

2.	Headers HTTP Cache-Control: s-maxage=... para aprovechar CDN/reverse proxy.

3.	SWR en el cliente con refreshInterval (no refetch agresivo) y stale-while-revalidate UX.

4.	Agregación ligera (y si conectas N41/servicios, mantener joins pre-agrupados en gold/*).

Test manual
●	Primera llamada (cold) debería ser << 2 s con sintético.

●	Siguientes llamadas (warm) ~1–10 ms desde LRU (ver _meta.latency_ms en JSON de /api/kpi).

 
Extensiones (opcional siguiente sprint)
●	Conectar fuentes reales:

○	Token (precio/supply/holders) desde gold/metrics/token_daily/.

○	Red (tx/fees/activos) desde gold/metrics/transactions_daily/.

○	DAO (proposals/votes) desde gold/dao/*.parquet.

●	Exportar CSV y PNG por gráfico.

●	KPI Alerts (picos de volumen o caída de votación) vía Webhooks/Slack.

El scaffold ya cumple DoD con caché y tiempos medidos en _meta. Integrar fuentes reales solo exige sustituir buildSynthetic(...) por tus fetchers hacia N41.
Tú dijiste:
programa a nivel de detalle para Gnew N48 Objetivo: Pipeline MLOps. Roles: ML Engineer (lead), DevOps. Entregables: tracking (MLflow), versionado datasets. DoD: reproducibilidad 100%, artefacto empaquetado.
ChatGPT Plus
Pensó durante 1m 29s
