
/**
 * GNEW • N264 — API de Misiones Semanales (basado en feedback)
 * Monorepo: apps/api  (backend principal con Express 4.x)
 *
 * Expone endpoints REST para:
 *  - POST /api/feedback/plan  → genera plan de misiones semanales a partir de feedback
 *  - GET  /api/missions/weekly → devuelve un plan determinista (semana indicada o próxima)
 *
 * Seguridad y buenas prácticas:
 *  - Validación manual de payload (sin dependencias externas).
 *  - Límites configurables (máx. 1,000 items de feedback; cadenas ≤ 10k chars).
 *  - Headers de no-cache y JSON estricto.
 *
 * Integración:
 *  - Requiere el módulo de IA creado en N263:
 *      packages/ai/quests/src/feedback-2-weekly-missions.ts
 *    Importamos: planWeeklyMissions, tipos públicos.
 *
 * Cómo usar desde app.ts:
 *  import express from "express";
 *  import { registerMissionsRoutes } from "./routes/missions";
 *  const app = express();
 *  app.use(express.json({ limit: "1mb" }));
 *  registerMissionsRoutes(app);
 */

import type { Application, Request, Response } from "express";
import { planWeeklyMissions, type FeedbackItem, type Options, type MissionPlan } from "../../../packages/ai/quests/src/feedback-2-weekly-missions";

type Json = Record<string, unknown> | unknown[];

// Constantes de seguridad / validación
const MAX_FEEDBACK = 1000;
const MAX_TEXT_LEN = 10_000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Registra las rutas en una instancia de Express 4.x.
 */
export function registerMissionsRoutes(app: Application) {
  // Middleware de headers comunes
  app.use("/api/", (_req, res, next) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  /**
   * POST /api/feedback/plan
   * Body:
   *  {
   *    feedback: FeedbackItem[],
   *    options?: { weekStart?: string(YYYY-MM-DD), minMissionsPerWeek?: number, maxMissionsPerWeek?: number, seed?: number }
   *  }
   */
  app.post("/api/feedback/plan", (req: Request, res: Response) => {
    try {
      const { feedback, options } = req.body || {};

      // Validación de feedback
      if (!Array.isArray(feedback)) return badRequest(res, "Campo 'feedback' debe ser un array");

      if (feedback.length === 0) return badRequest(res, "Se requiere al menos un elemento de feedback");
      if (feedback.length > MAX_FEEDBACK) return badRequest(res, `Máximo permitido: ${MAX_FEEDBACK} elementos de feedback`);

      const normalized: FeedbackItem[] = [];
      for (let i = 0; i < feedback.length; i++) {
        const it = feedback[i] ?? {};
        const err = validateFeedbackItem(it, i);
        if (err) return badRequest(res, err);
        normalized.push({
          id: String(it.id),
          userId: String(it.userId),
          text: String(it.text),
          timestamp: String(it.timestamp),
          locale: it.locale ? String(it.locale) : undefined,
          tags: Array.isArray(it.tags) ? it.tags.map(String) : undefined,
          votes: typeof it.votes === "number" ? it.votes : undefined,
          sentiment: typeof it.sentiment === "number" ? clamp(it.sentiment, -1, 1) : undefined,
        });
      }

      // Validación de options
      const opts: Options = {};
      if (options && typeof options === "object") {
        if (typeof options.minMissionsPerWeek === "number") opts.minMissionsPerWeek = clampInt(options.minMissionsPerWeek, 1, 20);
        if (typeof options.maxMissionsPerWeek === "number") opts.maxMissionsPerWeek = clampInt(options.maxMissionsPerWeek, 1, 30);
        if (typeof options.seed === "number") opts.seed = Math.abs(Math.trunc(options.seed));
        if (typeof options.weekStart === "string") {
          if (!ISO_DATE_RE.test(options.weekStart)) return badRequest(res, "options.weekStart debe tener formato YYYY-MM-DD");
          const d = new Date(options.weekStart + "T00:00:00Z");
          if (Number.isNaN(+d)) return badRequest(res, "options.weekStart no es una fecha válida");
          opts.weekStart = d;
        }
      }

      const plan: MissionPlan = planWeeklyMissions(normalized, opts);
      ok(res, plan);
    } catch (e: any) {
      internalError(res, "Error generando el plan de misiones", e);
    }
  });

  /**
   * GET /api/missions/weekly?weekStart=YYYY-MM-DD&seed=number
   * Genera un plan determinista vacío (útil para UI/preview) o basado en feedback opcional en query (?ids=... no implementado aquí).
   */
  app.get("/api/missions/weekly", (req: Request, res: Response) => {
    try {
      const { weekStart, seed } = req.query as Record<string, string | undefined>;

      let d: Date | undefined;
      if (weekStart) {
        if (!ISO_DATE_RE.test(weekStart)) return badRequest(res, "weekStart debe tener formato YYYY-MM-DD");
        d = new Date(weekStart + "T00:00:00Z");
        if (Number.isNaN(+d)) return badRequest(res, "weekStart no es una fecha válida");
      }

      const s = seed ? Math.abs(parseInt(seed, 10)) || undefined : undefined;

      // Plan con feedback mínimo de ejemplo (para que la UI tenga estructura)
      const demo: FeedbackItem[] = [
        { id: "demo-1", userId: "system", text: "Bug: la wallet móvil tarda en abrir.", timestamp: new Date().toISOString(), tags: ["wallet","mobile"], votes: 7 },
        { id: "demo-2", userId: "system", text: "Sugerencia: modo oscuro en la app web.", timestamp: new Date().toISOString(), tags: ["feature","ui"], votes: 12 },
        { id: "demo-3", userId: "system", text: "Docs: falta guía de API para integradores.", timestamp: new Date().toISOString(), tags: ["docs"], votes: 4 },
        { id: "demo-4", userId: "system", text: "Seguridad: exigir 2FA para cambios de clave.", timestamp: new Date().toISOString(), tags: ["security","auth"], votes: 15 },
      ];

      const plan = planWeeklyMissions(demo, { weekStart: d, seed: s, minMissionsPerWeek: 4, maxMissionsPerWeek: 6 });
      ok(res, plan);
    } catch (e: any) {
      internalError(res, "Error obteniendo misiones semanales", e);
    }
  });
}

/* ========================= Helpers & Validation ========================= */

function badRequest(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message } });
}

function internalError(res: Response, message: string, err?: unknown) {
  // Nota: no filtramos el error en producción; ajustar logger real en app.ts
  return res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message, detail: String(err || "") } });
}

function ok(res: Response, data: Json) {
  return res.status(200).json({ ok: true, data });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function validateFeedbackItem(it: any, index: number): string | null {
  const where = `feedback[${index}]`;
  if (!it || typeof it !== "object") return `${where} debe ser un objeto`;
  for (const key of ["id", "userId", "text", "timestamp"]) {
    if (!(key in it)) return `${where}.${key} es requerido`;
  }
  if (typeof it.text !== "string") return `${where}.text debe ser string`;
  if (it.text.length === 0) return `${where}.text no puede estar vacío`;
  if (it.text.length > MAX_TEXT_LEN) return `${where}.text excede el máximo de ${MAX_TEXT_LEN} caracteres`;
  if (typeof it.id !== "string" || it.id.length === 0) return `${where}.id debe ser string no vacío`;
  if (typeof it.userId !== "string" || it.userId.length === 0) return `${where}.userId debe ser string no vacío`;
  if (typeof it.timestamp !== "string" || Number.isNaN(+new Date(it.timestamp))) return `${where}.timestamp debe ser ISO válido`;
  if (it.tags && !Array.isArray(it.tags)) return `${where}.tags debe ser array de strings`;
  if (typeof it.votes !== "undefined" && typeof it.votes !== "number") return `${where}.votes debe ser number`;
  if (typeof it.sentiment !== "undefined" && typeof it.sentiment !== "number") return `${where}.sentiment debe ser number`;
  return null;
}

// Export default para conveniencia en algunos estilos de import
export default registerMissionsRoutes;

Tú dijiste:
Ejecuta el siguiente prompt N del archivo "/mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt", empezando en N251. En cada ejecución incrementa N en +1 hasta N420, sin repetir. Como IA programadora, entrega exactamente lo indicado por el prompt con máxima precisión, empezando tu respuesta con la ruta completa del archivo de salida y, a continuación, el programa/artefacto en el lenguaje o formato especificado, coherente con todo el proyecto GNEW (monorepo Node/TS, Solidity, Terraform, CI/CD, seguridad). Mantén consistencia con estándares y DoD del documento y conserva un puntero interno de progreso para continuar en N+1 en la siguiente ejecución.
ChatGPT Plus

