"use client"; 
 
import { useMemo, useState } from "react";
import {
  compareVariants,
  ComparePayload,
  CompareResponse,
} from "@/app/lib/voteCompareClient";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
LineChart, Line, CartesianGrid, 
} from "recharts"; 
 
type VariantKey = "one_person_one_vote" | "token_weighted" | "quadratic_voting";

function computeWeight(i: number) {
  if (i < 12) return 10;
  return i < 40 ? 3 : 1;
}

function computeLabel(v: VariantKey) {
  if (v === "one_person_one_vote") return "1p=1v";
  return v === "token_weighted" ? "Token-weighted" : "Quadratic";
}
 
export default function VariantsPanel({ demo = false }: Readonly<{ demo?:
boolean }>) {
  const [loading, setLoading] = useState(false); 
  const [err, setErr] = useState<string | null>(null); 
  const [data, setData] = useState<CompareResponse | null>(null);
 
  const payload: ComparePayload = useMemo(() => {
    if (!demo) return { options: [], voters: [], ballots: [] };
 
    // Dataset de ejemplo: 4 opciones, 120 votantes en 3 segmentos 
    const options = [ 
      { id: "A", title: "Opción A" }, 
      { id: "B", title: "Opción B" }, 
      { id: "C", title: "Opción C" }, 
      { id: "D", title: "Opción D" }, 
    ]; 
    const voters = Array.from({ length: 120 }, (_, i) => ({
      id: `v${i + 1}`,
      // 10% whales (peso 10), 28% mid (peso 3), resto 1
      weight: computeWeight(i),
      credits: 9,
      segment: i < 40 ? "core" : "new",
    }));
    const ballots = voters.map((v, i) => { 
      // preferencias sintéticas: core prefiere A/B, newcomers C/D 
      const s: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }; 
      if (v.segment === "core") { 
        s.A = 3 + (i % 3 === 0 ? 2 : 0); 
        s.B = 2; 
        s.C = 1; 
      } else { 
        s.C = 3 + (i % 4 === 0 ? 2 : 0); 
        s.D = 2; 
        s.B = 1; 
      } 
      return { voterId: v.id, scores: s, ts: Date.now() - 
Math.random() * 86400e3 }; 
    }); 
 
    return { 
      options, voters, ballots, 
      variants: ["one_person_one_vote", "token_weighted", 
"quadratic_voting"], 
      qv_cost: "quadratic", 
      qv_credits_default: 9, 
      perturbations: 200, 
      perturb_strength: 0.12, 
    }; 
  }, [demo]); 
 
  async function run() { 
    try { 
      setErr(null); 
      setLoading(true); 
      const r = await compareVariants(payload); 
      setData(r); 
    } catch (e: any) { 
      setErr(e?.message ?? "Error"); 
    } finally { 
      setLoading(false); 
    } 
  } 
 
  const barsData = useMemo(() => { 
    if (!data) return []; 
    // dataset para barras: score normalizado por opción y variante 
    const rows: Array<Record<string, number | string>> = [];
    for (const op of data.options) {
      const row: Record<string, number | string> = { option: op.title };
      for (const s of data.summary) {
        row[s.variant] = Number((s.result.normTotals[op.id] *
100).toFixed(2));
      }
      rows.push(row);
    }
    return rows;
  }, [data]);

  const metricsData = useMemo(() => {
    if (!data) return [];
    return data.summary.map((s) => ({
      variant: s.variant,
      turnout: Number((s.metrics.turnoutRate * 100).toFixed(1)),
      gini: Number(s.metrics.giniByOption.toFixed(3)),
      top10: Number((s.metrics.top10Share * 100).toFixed(1)),
      margin: Number((s.metrics.decisiveMargin * 100).toFixed(1)),
      disagree: Number((s.metrics.disagreementRate * 100).toFixed(1)),
      sybil: Number((s.metrics.sybilSensitivity * 100).toFixed(2)),
      stability: Number((s.robustness.stability * 100).toFixed(1)),
      flip: Number((s.robustness.flipRate * 100).toFixed(1)),
    }));
  }, [data]);
 
  return ( 
    <section className="rounded-2xl border p-4 md:p-6 bg-white 
shadow-sm"> 
      <div className="flex items-center justify-between"> 
        <h2 className="text-lg md:text-xl font-semibold">Comparador de 
variantes</h2> 
        <button 
          onClick={run} 
          disabled={loading} 
          className="px-3 py-2 rounded-xl bg-black text-white 
disabled:opacity-50" 
        > 
          {loading ? "Calculando…" : "Calcular"} 
        </button> 
      </div> 
 
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>} 
 
      {!data && !err && ( 
        <p className="mt-3 text-sm text-gray-600"> 
          Pulsa “Calcular” para ver 1p1v vs ponderado por tokens vs 
cuadrático, con métricas de participación y robustez. 
        </p> 
      )} 
 
      {data && ( 
        <div className="mt-6 space-y-8"> 
          {/* Barras: cuota por opción y variante */} 
          <div> 
            <h3 className="font-medium">Cuota por opción 
(normalizada)</h3> 
            <div className="h-64"> 
              <ResponsiveContainer> 
                <BarChart data={barsData}> 
                  <CartesianGrid strokeDasharray="3 3" /> 
                  <XAxis dataKey="option" /> 
                  <YAxis unit="%" /> 
                  <Tooltip /> 
                  <Legend /> 
                  <Bar dataKey="one_person_one_vote" name="1p=1v" /> 
                  <Bar dataKey="token_weighted" name="Token-weighted" 
/> 
                  <Bar dataKey="quadratic_voting" name="Quadratic" /> 
                </BarChart> 
              </ResponsiveContainer> 
            </div> 
          </div> 
 
          {/* Líneas: robustez y participación por variante */} 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
            <div className="h-64"> 
              <h3 className="font-medium">Participación & 
Concentración</h3> 
              <ResponsiveContainer> 
                <LineChart data={metricsData}> 
                  <CartesianGrid strokeDasharray="3 3" /> 
                  <XAxis dataKey="variant" /> 
                  <YAxis /> 
                  <Tooltip /> 
                  <Legend /> 
                  <Line type="monotone" dataKey="turnout" 
name="Participación %" /> 
                  <Line type="monotone" dataKey="top10" name="Top 10% 
cuota %" /> 
                  <Line type="monotone" dataKey="gini" name="Gini" /> 
                </LineChart> 
              </ResponsiveContainer> 
            </div> 
            <div className="h-64"> 
              <h3 className="font-medium">Robustez</h3> 
              <ResponsiveContainer> 
                <LineChart data={metricsData}> 
                  <CartesianGrid strokeDasharray="3 3" /> 
                  <XAxis dataKey="variant" /> 
                  <YAxis /> 
                  <Tooltip /> 
                  <Legend /> 
                  <Line type="monotone" dataKey="stability" 
name="Estabilidad %" /> 
                  <Line type="monotone" dataKey="flip" name="Flip rate 
%" /> 
                  <Line type="monotone" dataKey="sybil" 
name="Sensibilidad Sybil (p.p.)" /> 
                </LineChart> 
              </ResponsiveContainer> 
            </div> 
          </div> 
 
          {/* Tabla simple de margen y desacuerdo */} 
          <div className="overflow-auto"> 
            <table className="min-w-full border text-sm"> 
              <thead> 
                <tr className="bg-gray-50"> 
                  <th className="p-2 text-left">Variante</th> 
                  <th className="p-2 text-right">Ganador</th> 
                  <th className="p-2 text-right">Margen decisivo 
%</th> 
                  <th className="p-2 text-right">Desacuerdo %</th> 
                </tr> 
              </thead> 
              <tbody> 
                {data.summary.map((s: any) => (
                  <tr key={s.variant} className="border-t">
                    <td className="p-2">{computeLabel(s.variant)}</td>
                    <td className="p-2 text-right">
                      {s.result.winner}
                    </td>
                    <td className="p-2 text-right">{(s.metrics.decisiveMargin * 100).toFixed(1)}</td>
                    <td className="p-2 text-right">{(s.metrics.disagreementRate * 100).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody> 
            </table> 
          </div> 
 
          {/* Notas */} 
          <p className="text-xs text-gray-500"> 
            Notas: Gini aproxima desigualdad de influencia; “Top10% 
cuota” mide concentración; “Sensibilidad Sybil” 
            estima cuánto crecería la cuota del ganador si los 
votantes más influyentes se dividen en identidades. 
          </p> 
        </div> 
      )} 
    </section> 
  ); 
} 
