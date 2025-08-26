import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.union([z.string().url(), z.literal("pgmem"), z.literal("mem")]),
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
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = Env.parse(process.env);
