
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Tutorials() {
  const { data, error } = useSWR("/api/tutorials", fetcher);
  if (error) return <div>Error loading tutorials</div>;
  if (!data) return <div>Loading...</div>;
  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tutorials</h1>
      <ul className="space-y-2">
        {data.map((t: any) => (
          <li key={t.id} className="border p-3 rounded">
            <h2 className="font-semibold">{t.title}</h2>
            <p>{t.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}


