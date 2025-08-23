import express from "express"; 
import helmet from "helmet"; 
import cors from "cors"; 
import { router as reportRouter } from "./routes/reports"; 
import { traceMiddleware } from "./infra/otel"; 
import { errorHandler } from "./infra/errors"; 
export const app = express(); 
app.disable("x-powered-by"); 
app.use(helmet()); 
app.use(cors({ origin: [/\.gnew\.org$/, /localhost/], credentials: 
true })); 
app.use(express.json({ limit: "1mb" })); 
app.use(traceMiddleware); 
app.get("/healthz", (_req,res)=>res.json({ ok:true })); 
app.use("/v1/reports", reportRouter); 
app.use(errorHandler); 
