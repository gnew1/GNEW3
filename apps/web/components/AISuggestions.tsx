"use client";
import { useMemo, useState } from "react";
import { callSummarize } from "@/app/lib/summarizeClient";

type Msg = { id: string; author?: string; role?: string; text: string; ts?: number };

export default function AISuggestions({
  conversationId,
  messages,
  lang = "es",
}: {
  conversationId?: string;
  messages: Msg[];
  lang?: "es" | "en";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof callSummarize>> | null>(null);

  const canRun = useMemo(() => messages && messages.length > 0, [messages]);

  async function run() {
    try {
      setLoading(true);
      setErr(null);
      const resp = await callSummarize({ conversationId, messages, lang, limit: 5 });
      setData(resp);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="ai-suggestions-title" className="rounded-2xl border border-gray-200 p-4 md:p-6 shadow-sm bg-white">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ai-suggestions-title" className="text-lg md:text-xl font-semibold">
          {lang === "es" ? "Sugerencias IA" : "AI Suggestions"}
        </h2>
        <button onClick={run} disabled={!canRun || loading} className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-50" aria-busy={loading}>
          {loading ? (lang === "es" ? "Analizando…" : "Analyzing…") : (lang === "es" ? "Generar" : "Generate")}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {data && (
        <div className="mt-4 space-y-6">
          <div>
            <h3 className="font-medium text-gray-900">{lang === "es" ? "TL;DR del debate" : "Debate TL;DR"}</h3>
            <ul className="mt-2 list-disc ps-5 space-y-1">
              {data.tldr.map((b) => (
                <li key={b} className="text-sm text-gray-800">
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900">{lang === "es" ? "Sugerencias accionables" : "Actionable suggestions"}</h3>
            <ul className="mt-2 space-y-3">
              {data.suggestions.map((sug) => (
                <li key={sug.title} className="rounded-xl border border-gray-200 p-3">
                  <div className="text-sm font-semibold">{sug.title}</div>
                  <div className="text-sm text-gray-700 mt-1">{sug.reason}</div>
                  {sug.cta && (
                    <div className="mt-2">
                      <button className="text-xs px-2 py-1 rounded-lg border border-gray-300 hover:bg-gray-50">{sug.cta}</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {lang === "es" ? "Confianza" : "Confidence"}: {(data.confidence * 100).toFixed(0)}% · {data.cache.hit ? (lang === "es" ? "Caché" : "Cache") : (lang === "es" ? "Nuevo" : "Fresh")} · {data.perf_ms} ms
            </span>
            <form
              className="flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                const fd = new FormData(form);
                const score = Number(fd.get("score"));
                await fetch("/api/summarize/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: data.meta.key, score }) });
              }}
            >
              <button name="score" value={1} className="px-2 py-1 rounded-lg border text-green-700 border-green-200 hover:bg-green-50" title={lang === "es" ? "Útil" : "Helpful"}>
                +1
              </button>
              <button name="score" value={-1} className="px-2 py-1 rounded-lg border text-red-700 border-red-200 hover:bg-red-50" title={lang === "es" ? "No útil" : "Not helpful"}>
                -1
              </button>
            </form>
          </div>
        </div>
      )}

      {!data && !error && (
        <p className="mt-3 text-sm text-gray-600">
          {lang === "es" ? "Pulsa \"Generar\" para obtener un resumen y sugerencias a partir del debate." : "Press \"Generate\" to get a summary and suggestions from the debate."}
        </p>
      )}
    </section>
  );
}
