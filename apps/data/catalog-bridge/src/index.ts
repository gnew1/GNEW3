
#!/usr/bin/env node
import express from "express";
import "./db.js";
import { cfg } from "./config.js";
import { catalog } from "./routes/catalog.js";
import { syncRoutes } from "./routes/sync.js";

const app = express();
app.use(express.json({ limit: "16mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/", syncRoutes);
app.use("/", catalog);

app.listen(cfg.port, () => {
  console.log(`data-catalog-bridge listening on :${cfg.port}`);
});


¿Sigo con N174 — Data Quality Rules (DQ) + Expectations runner integrado al catálogo (checks por tabla/partición y reportes) en la próxima ejecución?

