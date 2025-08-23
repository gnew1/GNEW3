
import express from "express";
import { json } from "body-parser";
import { notificationRouter } from "./routes/notifications";

const app = express();
app.use(json());

app.use("/notifications", notificationRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 8090;
app.listen(port, () => {
  console.log(`Notifications service running on port ${port}`);
});


