
import { Router } from "express";
import { saveEvent } from "../services/eventService";

const router = Router();

/**
 * POST /track/event
 * body: { userId: string, event: string, metadata?: object }
 */
router.post("/event", async (req, res) => {
  try {
    const { userId, event, metadata } = req.body;

    if (!userId || !event) {
      return res.status(400).json({ error: "userId and event are required" });
    }

    const result = await saveEvent({ userId, event, metadata });
    res.json({ success: true, id: result.id });
  } catch (err) {
    console.error("Error tracking event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as trackRouter };


