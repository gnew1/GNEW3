
import crypto from "node:crypto";
import { RULES, Cat } from "./rules.js";
import { db } from "./db.js";

export function fingerprint(text: string) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export function computeScores(text: string, lang?: string) {
  const t = text.normalize("NFKC");
  const scores: Record<Cat, number> = {
    sexual: 0, violence: 0, hate: 0, harassment: 0, self_harm: 0, illegal_goods: 0, piracy: 0, spam: 0, scam: 0, pii: 0, profanity: 0
  };
  const reasons: string[] = [];
  for (const [cat, arr] of Object.entries(RULES) as [Cat, RegExp[]][]) {
    for (const re of arr) {
      if (re.test(t)) {
        // scoring simple: contar hits y normalizar por longitud
        const hits = (t.match(re) || []).length;
        const base = Math.min(1, hits / Math.max(1, t.length / 120)); // ≈ cada ~120 chars
        scores[cat] = Math.max(scores[cat], base);
        reasons.push(`${cat}:${re.source}`);
      }
    }
  }
  // listas deny/allow de términos ajustan puntaje
  const denyTerms = terms("denyTerms");
  const allowTerms = terms("allowTerms");
  for (const term of denyTerms) {
    if (t.toLowerCase().includes(term)) {
      scores.spam = Math.max(scores.spam, 0.8);
      reasons.push(`denyTerm:${term}`);
    }
  }
  for (const term of allowTerms) {
    if (t.toLowerCase().includes(term)) {
      // relaja leve: útil para falsos positivos en contextos permitidos
      for (const k of Object.keys(scores) as Cat[]) scores[k] = Math.max(0, scores[k] - 0.1);
      reasons.push(`allowTerm:${term}`);
    }
  }
  return { scores, reasons, lang: lang ?? guessLang(t) };
}

function terms(list: "denyTerms"|"allowTerms") {
  const rows = db.prepare("SELECT value FROM lists WHERE list=?").all(list) as any[];
  return rows.map(r => String(r.value).toLowerCase());
}

function guessLang(t: string) {
  // heurística simple: presencia de tildes comunes → es, sino en
  if (/[áéíóúñ¡¿]/i.test(t)) return "es";
  return "en";
}


