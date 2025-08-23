
import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">GNEW Community Forum</h1>
      <p className="mb-4">Discuss ideas, share feedback, and connect with other members.</p>
      <ul className="list-disc ml-6 space-y-2">
        <li><Link href="/threads">Threads</Link></li>
        <li><Link href="/new-thread">Create New Thread</Link></li>
      </ul>
    </main>
  );
}


