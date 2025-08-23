
/**
 * GNEW · N339 — Legal Bot for Compliance Q&A
 * Rol: Legal + Backend + AI
 * Objetivo: Bot que responde a consultas de compliance legal.
 * Stack: Express API + motor de FAQ + OpenAI fallback.
 * Entregables: Endpoint REST /legalbot.
 * Pruebas/DoD: Devuelve respuesta contextual y auditada.
 * Seguridad & Observabilidad: Log de consultas en tabla.
 */

import express, { Request, Response } from "express";
import { Pool } from "pg";
import pino from "pino";
import OpenAI from "openai";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/gnew_privacy"
});

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const app = express();
app.use(express.json());

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

async function findFAQ(query: string): Promise<FAQ | null> {
  const res = await pool.query<FAQ>(
    "SELECT * FROM faq WHERE $1 ILIKE '%' || question || '%' LIMIT 1",
    [query]
  );
  return res.rows[0] ?? null;
}

async function logQuery(user: string, question: string, answer: string) {
  await pool.query(
    "INSERT INTO legalbot_logs(user_id, question, answer, created_at) VALUES ($1,$2,$3,$4)",
    [user, question, answer, new Date()]
  );
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/legalbot", async (req: Request, res: Response) => {
  const { user, question } = req.body;
  if (!user || !question) {
    return res.status(400).json({ error: "Missing user or question" });
  }

  try {
    const faq = await findFAQ(question);
    let answer: string;

    if (faq) {
      answer = faq.answer;
    } else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `Answer legal compliance question: ${question}` }]
      });
      answer = completion.choices[0].message?.content ?? "No answer found";
    }

    await logQuery(user, question, answer);
    res.json({ answer });
  } catch (err) {
    logger.error({ err }, "LegalBot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export function startLegalBot(port = 4004) {
  return app.listen(port, () => {
    logger.info(`Legal Bot service running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startLegalBot();
}


