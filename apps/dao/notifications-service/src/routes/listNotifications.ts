
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * Listar notificaciones de un usuario
 * query: ?userId=number
 */
router.get("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "userId query param is required" });
    }

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

export { router as listNotificationsRouter };


