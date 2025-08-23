
import express from "express";
import { json } from "body-parser";
import { createNotificationRouter } from "./routes/createNotification";
import { listNotificationsRouter } from "./routes/listNotifications";

const app = express();
app.use(json());

app.use("/notifications", createNotificationRouter);
app.use("/notifications", listNotificationsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 4006;
app.listen(port, () => {
  console.log(`Notifications service running on port ${port}`);
});


