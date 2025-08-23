import { Router, Request, Response } from "express"; 
import { summarize, SummarizeRequest } from "../services/summarize"; 
 
export const summarizeRouter = Router(); 
 
/** 
 * POST /summarize 
 * Body: { conversationId?: string, messages: 
[{id,author?,role?,text,ts?}], limit?, lang? } 
 */ 
summarizeRouter.post("/", (req: Request, res: Response) => { 
  try { 
    const payload = req.body as SummarizeRequest; 
    const resp = summarize(payload); 
    // cache-friendly headers (client/proxy) 
    res.setHeader("Cache-Control", "public, max-age=120"); // 2 min 
    res.status(200).json(resp); 
  } catch (e: any) { 
    res.status(400).json({ error: e?.message ?? "Bad Request" }); 
  } 
}); 
 
/** 
 * (Opcional) POST /summarize/feedback 
 * Body: { key: string, score: 1|-1, notes?: string } 
 * Para medir "calidad aceptable por encuesta" 
 */ 
const feedbackStore: Array<{ key: string; score: number; notes?: 
string; at: number }> = []; 
 
summarizeRouter.post("/feedback", (req: Request, res: Response) => { 
  const { key, score, notes } = req.body || {}; 
  if (!key || ![1, -1].includes(score)) { 
    return res.status(400).json({ error: "key y score (1|-1) 
requeridos" }); 
  } 
  feedbackStore.push({ key, score, notes, at: Date.now() }); 
  res.status(201).json({ ok: true }); 
}); 
 
/services/gateway/src/app.ts (añade las líneas marcadas) 
import express from "express"; 
import cors from "cors"; 
import bodyParser from "body-parser"; 
import { summarizeRouter } from "./routes/summarize"; 
 
const app = express(); 
app.use(cors()); 
app.use(bodyParser.json({ limit: "1mb" })); 
 
// ...otros middlewares/rutas existentes 
 
app.use("/summarize", summarizeRouter); // <-- NUEVO 
 
// ...error handlers y export 
export default app; 
 
