
import express from "express";
import cors from "cors";
import { governanceRouter } from "./routes/governance";

const app = express();
const port = process.env.PORT || 4010;

app.use(cors());
app.use(express.json());

app.use("/api/governance", governanceRouter);

app.listen(port, () => {
  console.log(`Onchain Governance Service running on port ${port}`);
});


