
import express from "express";
import cors from "cors";
import { metricsRouter } from "./routes/metrics";

const app = express();
const port = process.env.PORT || 4008;

app.use(cors());
app.use(express.json());

app.use("/api/metrics", metricsRouter);

app.listen(port, () => {
  console.log(`Analytics Service running on port ${port}`);
});


