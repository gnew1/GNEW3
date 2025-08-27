import { z } from "zod";

const Base = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});
const base = Base.parse(process.env);

const Env = z.object({
  DATABASE_URL: z
    .union([z.string().url(), z.literal("pgmem"), z.literal("mem")])
    .default(base.NODE_ENV === "production" ? ("pgmem" as never) : "pgmem"),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PORT: z.coerce.number().default(8096),
  JWT_AUDIENCE: z.string().default("gnew"),
  JWT_ISSUER: z.string().default("https://sso.example.com/"),
  JWT_PUBLIC_KEY: z.string().transform((s) => s.replace(/\\n/g, "\n")).default(""),
  RECON_TOLERANCE: z.coerce.number().default(0.01),
  RECON_DATE_WINDOW_DAYS: z.coerce.number().default(3),
  ALERT_DIFF_THRESHOLD: z.coerce.number().default(0.05),
  LOG_LEVEL: z.string().default("info"),
  PG_MEM: z.string().optional(),
  DISABLE_AUTH: z.string().optional(),
  NODE_ENV: Base.shape.NODE_ENV,
});

const parsed = Env.parse(process.env);
if (
  parsed.NODE_ENV === "production" &&
  (parsed.DATABASE_URL === "pgmem" || parsed.DATABASE_URL === "mem")
) {
  throw new Error("DATABASE_URL must be a real connection string in production");
}

export const env = parsed;
