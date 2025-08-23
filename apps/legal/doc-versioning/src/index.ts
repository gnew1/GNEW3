
#!/usr/bin/env node
import express from "express";
import { cfg } from "./config.js";
import "./db.js";
import { documents } from "./routes/documents.js";
import { versions } from "./routes/versions.js";
import { signatures } from "./routes/signatures.js";
import { verify } from "./routes/verify.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/documents", documents);
app.use("/documents", versions);       // POST /:docId/versions & GET /:docId/versions/:ver/diff
app.use("/documents", signatures);     // POST /:docId/versions/:ver/signatures
app.use("/verify", verify);

app.listen(cfg.port, () => console.log(`doc-versioning listening on :${cfg.port}`));


