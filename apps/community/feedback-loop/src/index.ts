
import express from "express";
import { json } from "body-parser";
import { feedbackRouter } from "./routes/feedback";

const app = express();
app.use(json());

app.use("/feedback", feedbackRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 8092;
app.listen(port, () => {
  console.log(`Feedback loop service running on port ${port}`);
});


