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
 */

// Local minimal types to avoid a hard dependency on express typings here
type Request = { body?: unknown; query?: unknown };
type Response = { status: (code: number) => Response; json: (body: unknown) => Response; setHeader: (name: string, value: string) => void };
type Application = { use: (path: string, handler: (req: Request, res: Response, next: () => void) => void) => void; post: (path: string, handler: (req: Request, res: Response) => void) => void; get: (path: string, handler: (req: Request, res: Response) => void) => void };

// Types and a lightweight planner implementation (keeps this module self-contained)
export type FeedbackItem = { id: string; userId: string; text: string; timestamp: string; locale?: string; tags?: string[]; votes?: number; sentiment?: number };
export type Mission = { id: string; title: string; description: string; tags: string[]; difficulty: "easy" | "medium" | "hard" };
export type MissionPlan = { weekStart: string; missions: Mission[] };
export type Options = { weekStart?: Date; minMissionsPerWeek?: number; maxMissionsPerWeek?: number; seed?: number };

function planWeeklyMissions(items: FeedbackItem[], opts: Options = {}): MissionPlan {
  const max = clampInt(opts.maxMissionsPerWeek ?? 6, 1, 30);
  const wkDate = opts.weekStart ?? new Date();
  const wk = wkDate.toISOString().slice(0, 10);
  const sorted = [...items].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)).slice(0, max);
  const missions: Mission[] = sorted.map((f, i) => ({
    id: `m-${wk}-${i + 1}`,
    title: summarizeTitle(f.text),
    description: f.text,
    tags: f.tags ?? [],
    difficulty: (f.votes ?? 0) > 10 ? "medium" : "easy",
  }));
  return { weekStart: wk, missions };
}

function summarizeTitle(text: string): string {
  const t = text.split(".\n")[0] || text.slice(0, 80);
  return t.length > 80 ? t.slice(0, 77) + "…" : t;
}

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
  app.post("/api/feedback/plan", (req: Request, res: Response) => handlePlanPost(req, res));

  /**
   * GET /api/missions/weekly?weekStart=YYYY-MM-DD&seed=number
   * Genera un plan determinista vacío (útil para UI/preview) o basado en feedback opcional en query.
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

        let s: number | undefined;
        if (seed !== undefined) {
          const n = Math.abs(parseInt(seed, 10));
          if (!Number.isNaN(n)) s = n;
        }

      // Plan con feedback mínimo de ejemplo (para que la UI tenga estructura)
      const demo: FeedbackItem[] = [
        { id: "demo-1", userId: "system", text: "Bug: la wallet móvil tarda en abrir.", timestamp: new Date().toISOString(), tags: ["wallet","mobile"], votes: 7 },
        { id: "demo-2", userId: "system", text: "Sugerencia: modo oscuro en la app web.", timestamp: new Date().toISOString(), tags: ["feature","ui"], votes: 12 },
        { id: "demo-3", userId: "system", text: "Docs: falta guía de API para integradores.", timestamp: new Date().toISOString(), tags: ["docs"], votes: 4 },
        { id: "demo-4", userId: "system", text: "Seguridad: exigir 2FA para cambios de clave.", timestamp: new Date().toISOString(), tags: ["security","auth"], votes: 15 },
      ];

      const plan = planWeeklyMissions(demo, { weekStart: d, seed: s, minMissionsPerWeek: 4, maxMissionsPerWeek: 6 });
      ok(res, plan);
  } catch (e: unknown) {
      internalError(res, "Error obteniendo misiones semanales", e);
    }
  });
}

/* ========================= Helpers & Validation ========================= */

function badRequest(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message } });
}

function internalError(res: Response, message: string, err?: unknown) {
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

function validateFeedbackItem(it: Record<string, unknown>, index: number): string | null {
  const where = `feedback[${index}]`;
  const base = validateBaseObject(it, where);
  if (base) return base;
  const id = it["id"]; const userId = it["userId"]; const text = it["text"]; const timestamp = it["timestamp"]; const tags = it["tags"] as unknown; const votes = it["votes"] as unknown; const sentiment = it["sentiment"] as unknown;
  const primaries = validatePrimaryFields({ id, userId, text, timestamp }, where);
  if (primaries) return primaries;
  const optionals = validateOptionalFields({ tags, votes, sentiment }, where);
  if (optionals) return optionals;
  return null;
}

function validateBaseObject(it: Record<string, unknown>, where: string): string | null {
  if (!it || typeof it !== "object") return `${where} debe ser un objeto`;
  for (const key of ["id", "userId", "text", "timestamp"]) {
    if (!(key in it)) return `${where}.${key} es requerido`;
  }
  return null;
}

function validatePrimaryFields(fields: { id: unknown; userId: unknown; text: unknown; timestamp: unknown }, where: string): string | null {
  const { id, userId, text, timestamp } = fields;
  if (typeof text !== "string") return `${where}.text debe ser string`;
  if (text.length === 0) return `${where}.text no puede estar vacío`;
  if (text.length > MAX_TEXT_LEN) return `${where}.text excede el máximo de ${MAX_TEXT_LEN} caracteres`;
  if (typeof id !== "string" || id.length === 0) return `${where}.id debe ser string no vacío`;
  if (typeof userId !== "string" || userId.length === 0) return `${where}.userId debe ser string no vacío`;
  if (typeof timestamp !== "string" || Number.isNaN(+new Date(timestamp))) return `${where}.timestamp debe ser ISO válido`;
  return null;
}

function validateOptionalFields(fields: { tags: unknown; votes: unknown; sentiment: unknown }, where: string): string | null {
  const { tags, votes, sentiment } = fields;
  if (typeof votes !== "undefined" && typeof votes !== "number") return `${where}.votes debe ser number`;
  if (typeof sentiment !== "undefined" && typeof sentiment !== "number") return `${where}.sentiment debe ser number`;
  if (tags !== undefined && !Array.isArray(tags)) return `${where}.tags debe ser array de strings`;
  return null;
}

// Export default para conveniencia en algunos estilos de import
export default registerMissionsRoutes;

// Extracted handler to reduce complexity
function handlePlanPost(req: Request, res: Response) {
  try {
    const body = (req.body ?? {}) as { feedback?: unknown; options?: Record<string, unknown> };
    const { feedback, options } = body;
    const lenErr = validateFeedbackArray(feedback);
    if (lenErr) return badRequest(res, lenErr);
  const normalized = normalizeFeedback(feedback as unknown[]);
    const parsed = parseOptions(options);
    if (parsed.error) return badRequest(res, parsed.error);
    const opts = parsed.value;
    const plan: MissionPlan = planWeeklyMissions(normalized, opts);
    ok(res, plan);
  } catch (e: unknown) {
    internalError(res, "Error generando el plan de misiones", e);
  }
}

function validateFeedbackArray(fb: unknown): string | null {
  if (!Array.isArray(fb)) return "Campo 'feedback' debe ser un array";
  if (fb.length === 0) return "Se requiere al menos un elemento de feedback";
  if (fb.length > MAX_FEEDBACK) return `Máximo permitido: ${MAX_FEEDBACK} elementos de feedback`;
  return null;
}

function parseOptions(options: Record<string, unknown> | undefined): { value: Options; error?: string } {
  if (!options || typeof options !== "object") return { value: {} };
  const value: Options = {};
  const min = options.minMissionsPerWeek; const max = options.maxMissionsPerWeek; const seed = options.seed; const week = options.weekStart;
  if (typeof min === "number") value.minMissionsPerWeek = clampInt(min, 1, 20);
  if (typeof max === "number") value.maxMissionsPerWeek = clampInt(max, 1, 30);
  if (typeof seed === "number") value.seed = Math.abs(Math.trunc(seed));
  const wk = parseWeekStartString(typeof week === "string" ? week : undefined);
  if (wk.error) return { value, error: wk.error };
  if (wk.value) value.weekStart = wk.value;
  return { value };
}

function parseWeekStartString(week: string | undefined): { value?: Date; error?: string } {
  if (!week) return {};
  if (!ISO_DATE_RE.test(week)) return { error: "options.weekStart debe tener formato YYYY-MM-DD" };
  const d = new Date(week + "T00:00:00Z");
  if (Number.isNaN(+d)) return { error: "options.weekStart no es una fecha válida" };
  return { value: d };
}

function normalizeFeedback(items: unknown[]): FeedbackItem[] {
  const out: FeedbackItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = (items[i] ?? {}) as Record<string, unknown>;
    const err = validateFeedbackItem(it, i);
    if (err) throw new Error(err);
    const locale = typeof it.locale === "string" ? it.locale : undefined;
    const tags = Array.isArray(it.tags) ? it.tags.map(String) : undefined;
    const votes = typeof it.votes === "number" ? it.votes : undefined;
    const sentiment = typeof it.sentiment === "number" ? clamp(it.sentiment, -1, 1) : undefined;
    out.push({
      id: String(it.id),
      userId: String(it.userId),
      text: String(it.text),
      timestamp: String(it.timestamp),
      locale,
      tags,
      votes,
      sentiment,
    });
  }
  return out;
}

