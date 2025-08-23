
/**
 * GNEW • N266 — Pruebas unitarias para feedback→misiones semanales
 * Monorepo: packages/ai/quests
 *
 * Cubre:
 *  - Conversión de feedback a misiones semanales (planWeeklyMissions).
 *  - Validación de límites (min/max misiones).
 *  - Determinismo con seed.
 *  - Inclusión de metadatos.
 *
 * Ejecutar con:
 *   pnpm test --filter @gnew/ai-quests
 */

import { describe, it, expect } from "vitest";
import { planWeeklyMissions, type FeedbackItem, type MissionPlan } from "../src/feedback-2-weekly-missions";

function makeFeedback(overrides: Partial<FeedbackItem> = {}): FeedbackItem {
  return {
    id: overrides.id ?? "f1",
    userId: overrides.userId ?? "u1",
    text: overrides.text ?? "La app tarda demasiado en cargar el dashboard.",
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    tags: overrides.tags ?? ["performance"],
    votes: overrides.votes ?? 10,
    sentiment: overrides.sentiment ?? 0.2,
  };
}

describe("planWeeklyMissions()", () => {
  it("genera un plan con al menos 1 misión a partir de feedback", () => {
    const feedback = [makeFeedback()];
    const plan: MissionPlan = planWeeklyMissions(feedback, { minMissionsPerWeek: 1, maxMissionsPerWeek: 3 });
    expect(plan.missions.length).toBeGreaterThanOrEqual(1);
    expect(plan.missions[0]).toHaveProperty("title");
    expect(plan.meta.totalFeedback).toBe(1);
  });

  it("respeta límites min/max de misiones", () => {
    const feedback = Array.from({ length: 20 }).map((_, i) => makeFeedback({ id: `f${i}`, text: `fb-${i}` }));
    const plan: MissionPlan = planWeeklyMissions(feedback, { minMissionsPerWeek: 5, maxMissionsPerWeek: 6 });
    expect(plan.missions.length).toBeGreaterThanOrEqual(5);
    expect(plan.missions.length).toBeLessThanOrEqual(6);
  });

  it("es determinista para el mismo seed", () => {
    const feedback = Array.from({ length: 5 }).map((_, i) => makeFeedback({ id: `f${i}` }));
    const plan1 = planWeeklyMissions(feedback, { seed: 42, minMissionsPerWeek: 2, maxMissionsPerWeek: 2 });
    const plan2 = planWeeklyMissions(feedback, { seed: 42, minMissionsPerWeek: 2, maxMissionsPerWeek: 2 });
    expect(plan1).toEqual(plan2);
  });

  it("produce planes distintos para seeds diferentes", () => {
    const feedback = Array.from({ length: 5 }).map((_, i) => makeFeedback({ id: `f${i}` }));
    const plan1 = planWeeklyMissions(feedback, { seed: 1 });
    const plan2 = planWeeklyMissions(feedback, { seed: 2 });
    expect(plan1.missions).not.toEqual(plan2.missions);
  });

  it("incluye metadatos agregados (byTheme)", () => {
    const feedback = [
      makeFeedback({ tags: ["performance"] }),
      makeFeedback({ id: "f2", tags: ["security"], text: "Falta 2FA" }),
    ];
    const plan = planWeeklyMissions(feedback, {});
    expect(plan.meta.totalFeedback).toBe(2);
    expect(Object.keys(plan.meta.byTheme).length).toBeGreaterThan(0);
  });

  it("usa weekStart si se especifica", () => {
    const start = new Date("2025-01-06T00:00:00Z");
    const feedback = [makeFeedback()];
    const plan = planWeeklyMissions(feedback, { weekStart: start });
    expect(new Date(plan.weekStart).toISOString().startsWith("2025-01-06")).toBe(true);
  });

  it("genera criterios de aceptación no vacíos", () => {
    const feedback = [makeFeedback({ text: "Bug: no funciona el login con Google" })];
    const plan = planWeeklyMissions(feedback, {});
    expect(plan.missions[0].acceptanceCriteria.length).toBeGreaterThan(0);
  });
});


✅ Explicación N266

Se usa Vitest (alineado con monorepo GNEW).

Cada prueba valida reglas clave: límites de misiones, determinismo, metadatos, weekStart, criterios de aceptación.

Garantiza que el módulo de N263 se mantenga estable y confiable bajo cambios futuros.

👉 En la siguiente ejecución continuaré con N267.

Tú dijiste:
Ejecuta el siguiente prompt N del archivo "/mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt", empezando en N251. En cada ejecución incrementa N en +1 hasta N420, sin repetir. Como IA programadora, entrega exactamente lo indicado por el prompt con máxima precisión, empezando tu respuesta con la ruta completa del archivo de salida y, a continuación, el programa/artefacto en el lenguaje o formato especificado, coherente con todo el proyecto GNEW (monorepo Node/TS, Solidity, Terraform, CI/CD, seguridad). Mantén consistencia con estándares y DoD del documento y conserva un puntero interno de progreso para continuar en N+1 en la siguiente ejecución.
ChatGPT Plus

