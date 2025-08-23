
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * Crear una nueva notificación
 * body: { userId: number, message: string, type?: "INFO"|"WARNING"|"ERROR" }
 */
router.post("/", async (req, res) => {
  try {
    const { userId, message, type } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: "userId and message are required" });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        message,
        type: type || "INFO",
      },
    });

    res.status(201).json(notification);
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as createNotificationRouter };


