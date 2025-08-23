
import { Router } from "express";
import { submitFeedback, listFeedback } from "../services/feedbackService";

const router = Router();

/**
 * POST /feedback
 * body: { userId: string, content: string }
 */
router.post("/", async (req, res) => {
  try {
    const { userId, content } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ error: "userId and content are required" });
    }
    const entry = await submitFeedback(userId, content);
    res.json({ success: true, entry });
  } catch (err) {
    console.error("Error submitting feedback:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /feedback
 */
router.get("/", async (_req, res) => {
  try {
    const entries = await listFeedback();
    res.json(entries);
  } catch (err) {
    console.error("Error listing feedback:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as feedbackRouter };


