
import express from "express";
import { json } from "body-parser";
import { rewardsRouter } from "./routes/rewards";

const app = express();
app.use(json());

app.use("/rewards", rewardsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 8094;
app.listen(port, () => {
  console.log(`Guild Rewards service running on port ${port}`);
});


