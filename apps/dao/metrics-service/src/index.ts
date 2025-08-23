
import express from "express";
import { json } from "body-parser";
import { collectMetricsRouter } from "./routes/collectMetrics";
import { getMetricsRouter } from "./routes/getMetrics";

const app = express();
app.use(json());

app.use("/metrics", collectMetricsRouter);
app.use("/metrics", getMetricsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 4007;
app.listen(port, () => {
  console.log(`Metrics service running on port ${port}`);
});


