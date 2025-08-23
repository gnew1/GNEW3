
import express from "express";
import { json } from "body-parser";
import { trackRouter } from "./routes/track";

const app = express();
app.use(json());

app.use("/track", trackRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 8085;
app.listen(port, () => {
  console.log(`Activity Tracker running on port ${port}`);
});


