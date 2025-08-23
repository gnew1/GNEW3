
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * GET /tasks
 * returns all scheduled tasks
 */
router.get("/", async (_req, res) => {
  try {
    const tasks = await prisma.scheduledTask.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as listTasksRouter };


