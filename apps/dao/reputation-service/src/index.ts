
import express from "express";
import { json } from "body-parser";
import { getReputationRouter } from "./routes/getReputation";
import { updateReputationRouter } from "./routes/updateReputation";

const app = express();
app.use(json());

app.use("/reputation", getReputationRouter);
app.use("/reputation", updateReputationRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 4010;
app.listen(port, () => {
  console.log(`Reputation service running on port ${port}`);
});


