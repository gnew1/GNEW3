
import express from "express";
import { json } from "body-parser";
import { sendEmailRouter } from "./routes/sendEmail";

const app = express();
app.use(json());

app.use("/email", sendEmailRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 7070;
app.listen(port, () => {
  console.log(`Email Service running on port ${port}`);
});


