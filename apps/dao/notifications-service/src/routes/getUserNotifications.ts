
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * GET /notifications/:userId
 * returns list of notifications for that user
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as getUserNotificationsRouter };


