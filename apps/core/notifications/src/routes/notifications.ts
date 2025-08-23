
import { Router } from "express";
import { sendNotification } from "../services/notificationService";

const router = Router();

/**
 * POST /notifications/send
 * body: { userId: string, message: string, channel?: "email" | "sms" | "inapp" }
 */
router.post("/send", async (req, res) => {
  try {
    const { userId, message, channel } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: "userId and message are required" });
    }

    const result = await sendNotification(userId, message, channel || "inapp");
    res.json({ success: true, result });
  } catch (err) {
    console.error("Error sending notification:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as notificationRouter };


