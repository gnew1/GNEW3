
import React from "react";
import useSWR from "swr";
import { QuickstartChart } from "../ui/QuickstartChart";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function App() {
  const { data, error } = useSWR("/api/metrics/quickstarts", fetcher, { refreshInterval: 10000 });

  if (error) return <p>Error loading metrics</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>GNEW DevRel Dashboard</h1>
      <QuickstartChart metrics={data} />
    </div>
  );
}


