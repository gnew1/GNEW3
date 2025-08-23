
import { useState } from "react";

export default function NewThread() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");

  const submit = async () => {
    await fetch("/api/threads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, author, content })
    });
    setTitle(""); setAuthor(""); setContent("");
    alert("Thread created");
  };

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">New Thread</h1>
      <input className="border p-2 w-full mb-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
      <input className="border p-2 w-full mb-2" placeholder="Author" value={author} onChange={e=>setAuthor(e.target.value)} />
      <textarea className="border p-2 w-full mb-2" placeholder="Content" value={content} onChange={e=>setContent(e.target.value)} />
      <button onClick={submit} className="bg-teal-600 text-white px-4 py-2 rounded">Submit</button>
    </main>
  );
}


