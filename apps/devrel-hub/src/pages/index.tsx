
import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">GNEW DevRel Hub</h1>
      <p className="mb-4">
        Centralized hub for tutorials, blog posts, metrics dashboards, and community content.
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li><Link href="/tutorials">Tutorials</Link></li>
        <li><Link href="/blog">Blog</Link></li>
        <li><Link href="/metrics">Metrics</Link></li>
      </ul>
    </main>
  );
}


