
import express, { Request, Response } from "express";
import { z } from "zod";
import { broadcastNotification } from "../websocket/server";

const router = express.Router();

const schema = z.object({
  type: z.enum(["proposal_update", "vote_cast", "system_alert"]),
  payload: z.any(),
});

router.post("/", (req: Request, res: Response) => {
  try {
    const parsed = schema.parse(req.body);
    broadcastNotification(parsed);
    res.json({ status: "sent" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


