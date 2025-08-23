
import express from "express";
import { json } from "body-parser";
import { sendAlertRouter } from "./routes/sendAlert";
import { listAlertsRouter } from "./routes/listAlerts";

const app = express();
app.use(json());

app.use("/alerts", sendAlertRouter);
app.use("/alerts", listAlertsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 4008;
app.listen(port, () => {
  console.log(`Alerts service running on port ${port}`);
});


