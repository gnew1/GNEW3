
/**
 * GNEW • N263 — IA que convierte feedback de usuarios en misiones semanales con recompensas.
 * Monorepo: packages/ai/quests
 * Lenguaje: TypeScript (Node >=18)
 *
 * Descripción:
 *  - Toma feedback libre de usuarios y lo agrupa por temas (heurístico).
 *  - Genera un "plan de misiones" semanal con dificultad, criterios de aceptación y recompensas en tokens/badges.
 *  - Priorización basada en volumen, votos, urgencia percibida (sentimiento) e impacto por etiqueta.
 *  - Sin dependencias externas (pluggable), listo para integrarse con el resto del ecosistema GNEW (DAO, CI/CD).
 *
 * Uso:
 *   import { planWeeklyMissions, MissionPlan, FeedbackItem } from "./feedback-2-weekly-missions";
 *   const plan = planWeeklyMissions(feedbackArray, { weekStart: new Date("2025-08-18") });
 *   console.log(JSON.stringify(plan, null, 2));
 */

//////////////////////////////
// Tipos y contratos
//////////////////////////////

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

export interface FeedbackItem {
  id: string;
  userId: string;
  text: string;
  timestamp: string; // ISO
  locale?: string; // ej. "es", "en"
  tags?: string[]; // ej. ["wallet","mobile","staking"]
  votes?: number; // upvotes o me‑gusta
  sentiment?: number; // [-1 .. 1] si viene precalculado; opcional
}

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
  sourceFeedbackIds: string[];
  expiration: string; // ISO (fin de semana)
}

export interface MissionPlan {
  weekStart: string; // ISO (lunes 00:00)
  weekEnd: string;   // ISO (domingo 23:59:59)
  generatedAt: string;
  missions: Mission[];
  meta: {
    totalFeedback: number;
    byTheme: Record<Theme, number>;
    notes: string[];
  };
}

export interface Options {
  weekStart?: Date; // por defecto: siguiente Lunes UTC a partir de hoy
  minMissionsPerWeek?: number; // default 4
  maxMissionsPerWeek?: number; // default 7
  seed?: number; // para desempates deterministas
}

//////////////////////////////
// Utilidades puras
//////////////////////////////

const THEMES: Theme[] = [
  "bug-fix",
  "feature-request",
  "docs",
  "community",
  "performance",
  "security",
  "ui-ux",
  "onboarding",
  "support",
];

const THEME_KEYWORDS: Record<Theme, string[]> = {
  "bug-fix": [
    "bug", "error", "fallo", "crash", "bloqueo", "no funciona", "regresión", "falla",
    "issue", "stacktrace", "exception",
  ],
  "feature-request": [
    "feature", "característica", "añadir", "agregar", "soporte para", "me gustaría",
    "sería genial", "request", "sugerencia", "propuesta",
  ],
  docs: ["doc", "documentación", "guía", "readme", "tutorial", "manual", "api ref"],
  community: ["comunidad", "evento", "guild", "foro", "discord", "moderación", "mentoría"],
  performance: ["lento", "latencia", "rendimiento", "performance", "fps", "tps", "optimizar"],
  security: ["seguridad", "vulnerabilidad", "xss", "csrf", "phishing", "fraude", "kYC", "privacidad"],
  "ui-ux": ["ui", "ux", "interfaz", "diseño", "accesibilidad", "a11y", "confuso", "flujo"],
  onboarding: ["registro", "login", "onboarding", "primer uso", "tutorial inicial", "bienvenida"],
  support: ["soporte", "ayuda", "ticket", "contacto", "faq", "atención"],
};

const THEME_TAG_BONUS: Partial<Record<Theme, string[]>> = {
  security: ["security", "auth", "oauth", "kyc", "privacy"],
  performance: ["perf", "latency", "speed", "throughput"],
  "feature-request": ["feature", "idea", "proposal"],
  "bug-fix": ["bug", "fix", "regression"],
};

const BADGES_BY_THEME: Record<Theme, string> = {
  "bug-fix": "Bug Buster",
  "feature-request": "Product Visionary",
  docs: "Scribe",
  community: "Community Champion",
  performance: "Speedrunner",
  security: "Guardian",
  "ui-ux": "Design Polisher",
  onboarding: "Welcome Guide",
  support: "Helpful Hand",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function simpleSentiment(text: string): number {
  // Lexicón mínimo (es/en). Devuelve [-1..1]
  const NEG = [
    "malo","terrible","horrible","lento","peor","odio","no funciona","bug",
    "bad","terrible","awful","slow","worse","hate","broken","crash",
  ];
  const POS = [
    "genial","excelente","rápido","me encanta","gracias","súper","útil",
    "great","excellent","fast","love","thanks","super","useful",
  ];
  const T = text.toLowerCase();
  let s = 0;
  for (const w of POS) if (T.includes(w)) s += 1;
  for (const w of NEG) if (T.includes(w)) s -= 1;
  return clamp(s / 5, -1, 1);
}

function chooseTheme(text: string, tags: string[] = []): Theme {
  const t = text.toLowerCase();
  let best: { theme: Theme; score: number } | null = null;

  for (const theme of THEMES) {
    let score = 0;
    for (const kw of THEME_KEYWORDS[theme]) if (t.includes(kw)) score += 2;
    for (const tag of tags) if ((THEME_TAG_BONUS[theme] || []).includes(tag.toLowerCase())) score += 1;
    if (!best || score > best.score) best = { theme, score };
  }
  return (best?.score || 0) >= 2 ? best!.theme : "support";
}

function nextMonday(from = new Date()): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const day = d.getUTCDay(); // 0 Sun..6 Sat
  const add = (8 - (day || 7)) % 7; // days to next Monday
  d.setUTCDate(d.getUTCDate() + (add === 0 ? 7 : add)); // si hoy es lunes, usar el siguiente
  return d;
}

function weekEndFrom(start: Date): Date {
  const e = new Date(start);
  e.setUTCDate(e.getUTCDate() + 6);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}

function seededRandom(seed: number) {
  // xorshift32 simple
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

//////////////////////////////
// Núcleo de planificación
//////////////////////////////

type Cluster = {
  theme: Theme;
  feedback: FeedbackItem[];
  score: number; // prioridad agregada
};

function clusterFeedback(items: FeedbackItem[]): Cluster[] {
  const map = new Map<Theme, FeedbackItem[]>();
  for (const it of items) {
    const theme = chooseTheme(it.text, it.tags || []);
    if (!map.has(theme)) map.set(theme, []);
    map.get(theme)!.push(it);
  }
  const clusters: Cluster[] = [];
  for (const theme of THEMES) {
    const list = map.get(theme) || [];
    if (!list.length) continue;

    let score = 0;
    for (const it of list) {
      const s = typeof it.sentiment === "number" ? it.sentiment! : simpleSentiment(it.text);
      const votes = it.votes ?? 0;
      // Negatividad (problemas) incrementa prioridad; votos multiplican impacto.
      score += (1 + votes * 0.25) * (1 + Math.max(0, -s) * 1.5);
      // Etiquetas críticas
      if ((it.tags || []).some(t => ["wallet","payments","security","staking"].includes(t.toLowerCase()))) {
        score += 0.75;
      }
    }
    // Densidad también aporta
    score += Math.log2(1 + list.length);
    clusters.push({ theme, feedback: list, score });
  }
  // Ordenar por score descendente
  clusters.sort((a, b) => b.score - a.score);
  return clusters;
}

function difficultyFromCluster(c: Cluster): Difficulty {
  // Dificultad ~ volumen + severidad (negatividad) + dispersión de etiquetas
  const n = c.feedback.length;
  const avgSentNeg = c.feedback.reduce((acc, it) => {
    const s = typeof it.sentiment === "number" ? it.sentiment! : simpleSentiment(it.text);
    return acc + Math.max(0, -s);
  }, 0) / Math.max(1, n);

  const tagSpread = new Set(c.feedback.flatMap(it => (it.tags || []).map(t => t.toLowerCase()))).size;

  const score = n * 0.6 + avgSentNeg * 3 + Math.min(3, tagSpread * 0.5);
  if (score >= 6) return "hard";
  if (score >= 3) return "medium";
  return "easy";
}

function rewardFor(theme: Theme, diff: Difficulty, upvotesSum: number): Reward {
  const base: Record<Difficulty, number> = { easy: 50, medium: 100, hard: 200 };
  const themeMultiplier: Partial<Record<Theme, number>> = {
    security: 1.4,
    performance: 1.2,
    "bug-fix": 1.15,
  };
  const tokens = Math.round(base[diff] * (themeMultiplier[theme] ?? 1) * (1 + Math.min(2, upvotesSum * 0.05)));
  return { tokens: clamp(tokens, 30, 600), badge: BADGES_BY_THEME[theme] };
}

function summarizeCluster(c: Cluster): { title: string; description: string; criteria: string[] } {
  const sample = c.feedback[0]?.text || "";
  const title = (() => {
    switch (c.theme) {
      case "bug-fix": return "Corrección prioritaria de errores reportados por la comunidad";
      case "feature-request": return "Entrega de mejora solicitada por usuarios";
      case "docs": return "Mejora de documentación y guías prácticas";
      case "community": return "Impulso de comunidad y moderación";
      case "performance": return "Optimización de rendimiento percibido";
      case "security": return "Endurecimiento de seguridad";
      case "ui-ux": return "Pulido de UI/UX y accesibilidad";
      case "onboarding": return "Optimizar onboarding y primer‑uso";
      case "support": return "Refuerzo de soporte y resolución de tickets";
    }
  })();

  const description =
    `A partir del feedback agrupado (${c.feedback.length} elementos), ` +
    `se propone una misión para el tema "${c.theme}". Ejemplo de feedback: "${truncate(sample, 160)}". ` +
    `La misión debe abordar los puntos más repetidos y medir su impacto en satisfacción.`;

  const criteria = [
    "Definir alcance concreto en una issue épica vinculada a los feedbacks fuente.",
    "Entregar cambios verificables y medibles (tests, métricas o encuestas post‑cambio).",
    "Actualizar documentación y changelog.",
    "Demostrar reducción de quejas o mejora de métricas relacionadas ≥ 20% en 7 días (cuando aplique).",
  ];

  return { title, description, criteria };
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

//////////////////////////////
// API principal
//////////////////////////////

export function planWeeklyMissions(feedback: FeedbackItem[], opts: Options = {}): MissionPlan {
  const seed = (opts.seed ?? 1337) >>> 0;
  const rnd = seededRandom(seed);

  const weekStart = opts.weekStart ? toMondayUTC(opts.weekStart) : nextMonday(new Date());
  const weekEnd = weekEndFrom(weekStart);

  const clusters = clusterFeedback(feedback);
  const minM = clamp(opts.minMissionsPerWeek ?? 4, 1, 10);
  const maxM = clamp(opts.maxMissionsPerWeek ?? 7, minM, 12);

  // Tomar los top‑clusters y, si falta, completar al azar respetando diversidad de temas.
  const top = clusters.slice(0, maxM);
  while (top.length < minM) {
    // añade temas con menos volumen para diversidad
    const remaining = THEMES.filter(t => !top.some(c => c.theme === t));
    if (!remaining.length) break;
    const t = remaining[Math.floor(rnd() * remaining.length)];
    top.push({ theme: t, feedback: [], score: 0.1 });
  }

  const missions: Mission[] = top.map((c, idx) => {
    const diff = difficultyFromCluster(c);
    const upvotes = c.feedback.reduce((a, it) => a + (it.votes ?? 0), 0);
    const reward = rewardFor(c.theme, diff, upvotes);
    const { title, description, criteria } = summarizeCluster(c);

    const titleWithFlavor =
      title +
      (c.theme === "feature-request" && c.feedback.length
        ? ` — "${pickRepresentative(c.feedback, rnd).text.slice(0, 60)}…"`
        : "");

    const id = `${formatDate(weekStart)}-${slugify(title)}-${idx + 1}`;

    const criteriaPlus = [
      ...criteria,
      `Criterio DAO: registrar evidencia y solicitar verificación comunitaria para liberar ${reward.tokens} $GNEW.`,
    ];

    return {
      id,
      title: titleWithFlavor,
      description,
      theme: c.theme,
      difficulty: diff,
      reward,
      acceptanceCriteria: criteriaPlus,
      assigneePolicy: c.theme === "community" || c.theme === "docs" ? "open" : "guild",
      sourceFeedbackIds: c.feedback.map(f => f.id),
      expiration: weekEnd.toISOString(),
    };
  });

  // Garantizar unicidad de temas cuando hay demasiadas misiones similares:
  const seen = new Set<string>();
  const pruned: Mission[] = [];
  for (const m of missions) {
    const key = `${m.theme}-${m.difficulty}`;
    if (seen.has(key) && pruned.length >= minM) continue;
    seen.add(key);
    pruned.push(m);
  }

  const byTheme: Record<Theme, number> = Object.fromEntries(THEMES.map(t => [t, 0])) as any;
  for (const m of pruned) byTheme[m.theme]++;

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    generatedAt: new Date().toISOString(),
    missions: pruned.slice(0, maxM),
    meta: {
      totalFeedback: feedback.length,
      byTheme,
      notes: [
        "Plan generado de forma heurística; sustituible por LLM/embeddings vía provider interno.",
        "Recompensas calibradas por dificultad, votos e impacto (temas críticos: seguridad, rendimiento).",
      ],
    },
  };
}

function toMondayUTC(d: Date): Date {
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  while (m.getUTCDay() !== 1) m.setUTCDate(m.getUTCDate() - 1); // retroceder al lunes de esa semana si no lo es
  m.setUTCHours(0, 0, 0, 0);
  return m;
}

function pickRepresentative(list: FeedbackItem[], rnd: () => number): FeedbackItem {
  if (!list.length) {
    return { id: "none", userId: "na", text: "—", timestamp: new Date().toISOString() };
  }
  // Ponderar por votos y negatividad
  const weights = list.map(it => {
    const s = typeof it.sentiment === "number" ? it.sentiment! : simpleSentiment(it.text);
    const v = it.votes ?? 0;
    return 1 + v * 0.5 + Math.max(0, -s) * 1.5;
  });
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  let r = rnd() * sum;
  for (let i = 0; i < list.length; i++) {
    if ((r -= weights[i]) <= 0) return list[i];
  }
  return list[list.length - 1];
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

//////////////////////////////
// Ejemplo de uso manual
//////////////////////////////

/* Descomenta para probar localmente:
const feedback: FeedbackItem[] = [
  { id: "f1", userId: "u1", text: "La wallet móvil es lenta al iniciar sesión.", timestamp: "2025-08-15T10:00:00Z", tags: ["wallet","mobile"], votes: 12 },
  { id: "f2", userId: "u2", text: "Sería genial añadir soporte para cuentas multi‑firma.", timestamp: "2025-08-16T12:00:00Z", tags: ["feature"], votes: 18 },
  { id: "f3", userId: "u3", text: "Encontré un bug que bloquea el staking tras actualizar.", timestamp: "2025-08-16T15:00:00Z", tags: ["staking","bug"], votes: 9 },
  { id: "f4", userId: "u4", text: "La interfaz de la DAO es confusa en el flujo de voto.", timestamp: "2025-08-17T09:30:00Z", tags: ["ui"], votes: 7 },
  { id: "f5", userId: "u5", text: "Faltan guías claras para integrarse con la API.", timestamp: "2025-08-17T10:00:00Z", tags: ["docs"], votes: 5 },
];

console.log(JSON.stringify(planWeeklyMissions(feedback, { weekStart: new Date("2025-08-18") }), null, 2));
*/

//////////////////////////////
// Nota de integración
//////////////////////////////

/**
 * Integración sugerida:
 *  - Exponer este módulo vía un servicio interno (packages/api) para que el Frontend muestre
 *    las misiones de la semana en el perfil del usuario (N262) y para que la DAO procese
 *    la liberación de recompensas al cumplirse los criterios de aceptación.
 *  - Sustituir/compaginar el heurístico de themes por embeddings + LLM cuando esté disponible,
 *    preservando los mismos tipos/contratos para no romper consumidores.
 */


