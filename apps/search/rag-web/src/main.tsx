
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  async function doSearch() {
    if (!q.trim()) return;
    setBusy(true);
    setResults([]);
    const res = await fetch(`/search?q=${encodeURIComponent(q)}&k=8`);
    const data = await res.json();
    setResults(data.results || []);
    setBusy(false);
  }

  return (
    <div>
      <input className="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Consulta…" />
      <p><button onClick={doSearch} disabled={busy}>{busy ? "Buscando…" : "Buscar"}</button></p>
      {results.map((r, i) => (
        <div key={i} className="result">
          <div className="score">{(r.similarity*100).toFixed(1)}%</div>
          <p>{r.content}</p>
          <div className="cite">Fuente: <a href={r.citation.uri} target="_blank" rel="noreferrer">{r.citation.title}</a> — {r.citation.range}</div>
        </div>
      ))}
      {!busy && results.length === 0 && <p>Sin resultados aún.</p>}
    </div>
  );
}

createRoot(document.getElementById("out")!).render(<App />);


