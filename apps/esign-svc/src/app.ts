import express from "express"; 
import helmet from "helmet"; 
import cors from "cors"; 
import { router as tmpl } from "./routes/templates"; 
import { router as env } from "./routes/envelopes"; 
import { errorHandler } from "./infra/errors"; 
import { traceMiddleware } from "./infra/otel"; 
export const app = express(); 
app.disable("x-powered-by"); 
app.use(helmet()); 
app.use(cors({ origin: [/\.gnew\.org$/, /localhost/], credentials: 
true })); 
app.use(express.json({ limit: "2mb" })); 
app.use(traceMiddleware); 
app.get("/healthz", (_req,res)=>res.json({ ok:true })); 
app.use("/v1/templates", tmpl); 
app.use("/v1/envelopes", env); 
app.use(errorHandler); 
