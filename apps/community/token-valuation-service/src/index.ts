
import express from "express";
import cors from "cors";
import { valuationRouter } from "./routes/valuation";

const app = express();
const port = process.env.PORT || 4009;

app.use(cors());
app.use(express.json());

app.use("/api/valuation", valuationRouter);

app.listen(port, () => {
  console.log(`Token Valuation Service running on port ${port}`);
});


