import React from "react";
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
        {data.posts.map((message: any) => (
          <div key={message.id} className="border p-2 rounded">
            <p>{message.content}</p>
            <p className="text-xs text-gray-500">— {message.author}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
