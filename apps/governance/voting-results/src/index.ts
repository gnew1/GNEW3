
import express from "express";
import { json } from "body-parser";
import { resultsRouter } from "./routes/results";

const app = express();
app.use(json());

app.use("/results", resultsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 8093;
app.listen(port, () => {
  console.log(`Voting Results service running on port ${port}`);
});


