
import express from "express";
import { json } from "body-parser";
import { auditRouter } from "./routes/audit";

const app = express();
app.use(json());

app.use("/audit", auditRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 8091;
app.listen(port, () => {
  console.log(`Audit log service running on port ${port}`);
});


