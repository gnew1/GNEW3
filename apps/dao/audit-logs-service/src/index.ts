
import express from "express";
import { json } from "body-parser";
import { createLogRouter } from "./routes/createLog";
import { getLogsRouter } from "./routes/getLogs";

const app = express();
app.use(json());

app.use("/logs", createLogRouter);
app.use("/logs", getLogsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 4030;
app.listen(port, () => {
  console.log(`Audit Logs service running on port ${port}`);
});


