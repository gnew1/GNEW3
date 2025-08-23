import express from "express"; 
import helmet from "helmet"; 
import cors from "cors"; 
import { z } from "zod"; 
import { router as consentRouter } from "./routes/consent"; 
import { traceMiddleware } from "./infra/otel"; 
import { errorHandler } from "./infra/errors"; 
export const app = express(); 
app.disable("x-powered-by"); 
app.use(helmet()); 
app.use(cors({ origin: [/\.gnew\.org$/, /localhost/], credentials: 
true })); 
app.use(express.json({ limit: "256kb" })); 
app.use(traceMiddleware); 
app.get("/healthz", (_req, res) => res.json({ ok: true })); 
app.use("/v1/consent", consentRouter); 
app.use(errorHandler); 
