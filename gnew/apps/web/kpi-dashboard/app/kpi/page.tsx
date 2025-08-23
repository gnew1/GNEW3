"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { Filters } from "../../components/Filters";
import { KpiCard } from "../../components/KpiCard";
import { TimeSeriesChart } from "../../components/TimeSeriesChart";
import { StackedBarChart } from "../../components/StackedBarChart";
import { DonutChart } from "../../components/DonutChart";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function KPIDashboard() {
  const [chain, setChain] = useState("eth");
  const [network, setNetwork] = useState("mainnet");
  const [token, setToken] = useState("GNEW");
  const [range, setRange] = useState("30d");

  const { data, isLoading } = useSWR(
    `/api/kpi?chain=${chain}&network=${network}&token=${token}&range=${range}`,
    fetcher,
    { refreshInterval: 120_000, revalidateOnFocus: false }
  );

  const ts = data?.timeseries ?? [];
  const dao = data?.dao ?? {};
  const summary = data?.summary ?? {};

  return (
    <main className="container">
      <section className="card">
        <div className="grid grid-3">
          <Filters
            chain={chain} network={network} token={token} range={range}
            onChange={({chain,network,token,range}) => { setChain(chain); setNetwork(network); setToken(token); setRange(range); }}
          />
        </div>
      </section>

      <section className="grid grid-3" style={{marginTop:16}}>
        <KpiCard label="Precio" value={num(summary.price_usd)} suffix=" USD" loading={isLoading}/>
        <KpiCard label="Market Cap" value={num(summary.market_cap_usd)} suffix=" USD" loading={isLoading}/>
        <KpiCard label="TVL" value={num(summary.tvl_usd)} suffix=" USD" loading={isLoading}/>
        <KpiCard label="Tx 24h" value={num(summary.tx_count_24h)} loading={isLoading}/>
        <KpiCard label="Activos 24h" value={num(summary.active_addresses_24h)} loading={isLoading}/>
        <KpiCard label="APR Est." value={(summary.apr_estimate*100)?.toFixed?.(2)} suffix=" %" loading={isLoading}/>
      </section>

      <section className="grid grid-2" style={{marginTop:16}}>
        <div className="card">
          <h3>Precio & Volumen ({range})</h3>
          <TimeSeriesChart data={ts} lines={[
            { dataKey: "price", name: "Precio (USD)", yAxisId: "L" },
            { dataKey: "volume", name: "Volumen", yAxisId: "R" }
          ]} />
        </div>
        <div className="card">
          <h3>Actividad de Red ({range})</h3>
          <StackedBarChart data={ts} bars={[
            { dataKey: "tx", name: "Transacciones" },
            { dataKey: "active_addresses", name: "Direcciones activas" }
          ]}/>
        </div>
      </section>

      <section className="grid grid-2" style={{marginTop:16}}>
        <div className="card">
          <h3>Estructura de holders</h3>
          <DonutChart
            labels={["Top 10","10–100","100–1k","1k–10k","10k+"]}
            values={summary.holder_buckets ?? [35,25,20,12,8]}
          />
        </div>
        <div className="card">
          <h3>Gobernanza ({range})</h3>
          <div className="grid grid-3">
            <KpiCard label="Propuestas (30d)" value={dao.proposals_30d} loading={isLoading}/>
            <KpiCard label="Votantes únicos (30d)" value={dao.voters_30d} loading={isLoading}/>
            <KpiCard label="Participación" value={pct(dao.participation_rate_30d)} suffix="" loading={isLoading}/>
          </div>
        </div>
      </section>
    </main>
  );
}

function num(n?: number) {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return Intl.NumberFormat().format(n);
}
function pct(x?: number){ return x==null ? "—" : (x*100).toFixed(1) + " %"; }

