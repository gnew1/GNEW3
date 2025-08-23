
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import "./db.js";
import { ingest } from "./ingest.js";
import { routes } from "./routes.js";

const app = express();
app.use(express.json({ limit: "8mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true, cfg: { preMin: cfg.preMin, postMin: cfg.postMin } }));

app.use("/ingest", ingest);
app.use("/", routes);

app.listen(cfg.port, () => console.log(`anti-bribery-detector listening on :${cfg.port}`));

Notas de entrega

Ruta de monorepo coherente con GNEW: apps/governance/anti-bribery-detector.

Stack: graph analytics simple sobre SQLite + heurísticas on‑chain (inputs de transfers y votos).

Expansión futura:

Adaptador EVM (RPC) para logs de contratos de gobernanza y ERC‑20 Transfer.

Etiquetado de contracts (entities.isContract=1) por listas conocidas o ABIs.

Clasificador supervisado (sustituir/combinar con reglas).

DoD: POST /evaluate permite verificar precision/recall contra un dataset objetivo y ajustar ALERT_THRESHOLD.

