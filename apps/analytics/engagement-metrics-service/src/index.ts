
import express from "express";
import { json } from "body-parser";
import { getEngagementRouter } from "./routes/getEngagement";
import { trackEngagementRouter } from "./routes/trackEngagement";

const app = express();
app.use(json());

app.use("/engagement", getEngagementRouter);
app.use("/engagement", trackEngagementRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 5050;
app.listen(port, () => {
  console.log(`Engagement Metrics Service running on port ${port}`);
});


