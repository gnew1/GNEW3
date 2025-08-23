
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Threads() {
  const { data, error } = useSWR("/api/threads", fetcher, { refreshInterval: 5000 });
  if (error) return <div>Error loading threads</div>;
  if (!data) return <div>Loading...</div>;
  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Threads</h1>
      <ul className="space-y-2">
        {data.map((t: any) => (
          <li key={t.id} className="border p-3 rounded">
            <Link href={`/threads/${t.id}`}><b>{t.title}</b></Link>
            <p className="text-sm">{t.author}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}


/apps/community-forum/src/pages/threads/[id].tsx

import { useRouter } from "next/router";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ThreadPage() {
  const { query } = useRouter();
  const { data, error } = useSWR(query.id ? `/api/threads/${query.id}` : null, fetcher);
  if (error) return <div>Error loading thread</div>;
  if (!data) return <div>Loading...</div>;
  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{data.title}</h1>
      <p className="text-sm text-gray-500">By {data.author}</p>
      <div className="mt-4 space-y-2">
        {data.posts.map((p: any, i: number) => (
          <div key={i} className="border p-2 rounded">
            <p>{p.content}</p>
            <p className="text-xs text-gray-500">— {p.author}</p>
          </div>
        ))}
      </div>
    </main>
  );
}


