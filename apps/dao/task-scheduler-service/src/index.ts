
import express from "express";
import { json } from "body-parser";
import { scheduleTaskRouter } from "./routes/scheduleTask";
import { listTasksRouter } from "./routes/listTasks";
import { cancelTaskRouter } from "./routes/cancelTask";

const app = express();
app.use(json());

app.use("/tasks", scheduleTaskRouter);
app.use("/tasks", listTasksRouter);
app.use("/tasks", cancelTaskRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 4040;
app.listen(port, () => {
  console.log(`Task Scheduler service running on port ${port}`);
});


