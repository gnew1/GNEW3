
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * POST /notifications/send
 * body: { userId: string, message: string, type: "INFO" | "ALERT" | "SYSTEM" }
 */
router.post("/send", async (req, res) => {
  try {
    const { userId, message, type } = req.body;

    if (!userId || !message || !type) {
      return res.status(400).json({ error: "userId, message and type are required" });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        message,
        type,
        read: false,
        createdAt: new Date(),
      },
    });

    res.json(notification);
  } catch (err) {
    console.error("Error sending notification:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as sendNotificationRouter };


