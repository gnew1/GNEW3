/**
 * GNEW • N265 — Componente UI para mostrar misiones semanales
 * Monorepo: apps/web (Next.js + React 18)
 *
 * - Renderiza las misiones semanales generadas (N263) y expuestas vía API (N264).
 * - Incluye estado de carga, errores y fallback demo.
 * - Diseño minimalista (TailwindCSS), accesible, responsive.
 * - Seguridad: saneo de datos, claves únicas estables, sin HTML crudo.
 */

"use client";

import React, { useEffect, useState } from "react";

export type Difficulty = "easy" | "medium" | "hard";
export type Theme =
  | "bug-fix"
  | "feature-request"
  | "docs"
  | "community"
  | "performance"
  | "security"
  | "ui-ux"
  | "onboarding"
  | "support";

export interface Reward {
  tokens: number;
  badge?: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  theme: Theme;
  difficulty: Difficulty;
  reward: Reward;
  acceptanceCriteria: string[];
  assigneePolicy: "solo" | "guild" | "open";
  expiration: string;
}

export interface MissionPlan {
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  missions: Mission[];
  meta: {
    totalFeedback: number;
    byTheme: Record<Theme, number>;
    notes: string[];
  };
}

export const WeeklyMissionsBoard: React.FC = () => {
  const [data, setData] = useState<MissionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMissions() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/missions/weekly", { cache: "no-store" });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message || "Error desconocido");
        setData(json.data as MissionPlan);
      } catch (e: any) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    fetchMissions();
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-gray-500 animate-pulse">Cargando misiones semanales…</div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">Error al cargar misiones: {error}</div>
    );
  }

  if (!data || !data.missions.length) {
    return (
      <div className="p-4 text-gray-500">No hay misiones planificadas para esta semana.</div>
    );
  }

  return (
    <section className="w-full max-w-5xl mx-auto p-4 space-y-6">
      <header className="text-center">
        <h2 className="text-2xl font-bold">Misiones de la Semana</h2>
        <p className="text-sm text-gray-500">
          {formatDate(data.weekStart)} – {formatDate(data.weekEnd)}
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.missions.map((m) => (
          <li key={m.id} className="bg-white rounded-2xl shadow p-4 flex flex-col justify-between border border-gray-200">
            <div>
              <h3 className="text-lg font-semibold mb-2">{m.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{m.description}</p>
              <span className="inline-block text-xs rounded px-2 py-1 bg-gray-100 text-gray-700 mb-1">Tema: {m.theme}</span>
              <span className="inline-block text-xs rounded px-2 py-1 bg-indigo-100 text-indigo-700 ml-1 mb-1">Dificultad: {m.difficulty}</span>
            </div>
            <div className="mt-2 text-sm">
              <p className="font-medium">Recompensa:</p>
              <p>
                {m.reward.tokens} $GNEW {m.reward.badge ? `· ${m.reward.badge}` : ""}
              </p>
              <p className="text-xs text-gray-500">Expira: {formatDate(m.expiration)}</p>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-blue-600">Criterios de aceptación</summary>
              <ul className="list-disc list-inside text-xs text-gray-700 space-y-1 mt-1">
                {m.acceptanceCriteria.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default WeeklyMissionsBoard;

