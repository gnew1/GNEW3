
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import { migrate } from "./db.js";
import { ingest } from "./routes/ingest.js";
import { search } from "./routes/search.js";
import { docs } from "./routes/docs.js";

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true, provider: cfg.provider, dim: cfg.vectorDim }));

app.use("/ingest", ingest);
app.use("/search", search);
app.use("/docs", docs);

// Arranque + migración
migrate().then(() => {
  app.listen(cfg.port, () => console.log(`rag-service listening on :${cfg.port}`));
}).catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});


