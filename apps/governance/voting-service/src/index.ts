
import express from "express";
import { json } from "body-parser";
import { castVoteRouter } from "./routes/castVote";
import { getResultsRouter } from "./routes/getResults";

const app = express();
app.use(json());

app.use("/vote", castVoteRouter);
app.use("/results", getResultsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 6060;
app.listen(port, () => {
  console.log(`Voting Service running on port ${port}`);
});


