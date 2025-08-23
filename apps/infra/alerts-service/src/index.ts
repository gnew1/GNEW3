
import express from "express";
import cors from "cors";
import { alertsRouter } from "./routes/alerts";

const app = express();
const port = process.env.PORT || 4012;

app.use(cors());
app.use(express.json());

app.use("/api/alerts", alertsRouter);

app.listen(port, () => {
  console.log(`Alerts Service running on port ${port}`);
});


