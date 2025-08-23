import express from "express"; 
import helmet from "helmet"; 
import cors from "cors"; 
import { z } from "zod"; 
import { opaQuery } from "./opa"; 
import { validateInput } from "./schemas"; 
import { traceMiddleware } from "./otel"; 
import { errorHandler } from "./errors"; 
export const app = express(); 
app.disable("x-powered-by"); 
app.use(helmet()); 
app.use(cors({ origin: [/\.gnew\.org$/, /localhost/], credentials: 
true })); 
app.use(express.json({ limit: "256kb" })); 
app.use(traceMiddleware); 
app.get("/healthz", (_req,res)=>res.json({ ok:true })); 
// Access decision 
app.post("/v1/policy/access:decide", async (req, res, next) => { 
  try { 
    validateInput("access", req.body); // AJV contra JSON Schema 
    const out = await opaQuery("gnew/authz/v1/decision", req.body); 
    res.json(out.result ?? out); // devolvemos 
{allow,reason,obligations} 
  } catch (e) { next(e); } 
}); 
 
// Payments decision 
app.post("/v1/policy/payments:decide", async (req, res, next) => { 
  try { 
    validateInput("payments", req.body); 
    const out = await opaQuery("gnew/payments/v1/decision", req.body); 
    res.json(out.result ?? out); 
  } catch (e) { next(e); } 
}); 
 
app.use(errorHandler); 
 
