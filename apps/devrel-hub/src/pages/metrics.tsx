
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.text());

export default function Metrics() {
  const { data, error } = useSWR("/api/metrics", fetcher, { refreshInterval: 5000 });
  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Metrics</h1>
      {error && <div>Error loading metrics</div>}
      {!data ? <div>Loading...</div> : <pre className="bg-gray-100 p-4 text-xs overflow-x-auto">{data}</pre>}
    </main>
  );
}


