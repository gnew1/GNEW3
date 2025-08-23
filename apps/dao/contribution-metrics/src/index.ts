
import express from "express";
import { json } from "body-parser";
import { listMetricsRouter } from "./routes/listMetrics";
import { addContributionRouter } from "./routes/addContribution";

const app = express();
app.use(json());

app.use("/metrics", listMetricsRouter);
app.use("/metrics", addContributionRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 4009;
app.listen(port, () => {
  console.log(`Contribution metrics service running on port ${port}`);
});


