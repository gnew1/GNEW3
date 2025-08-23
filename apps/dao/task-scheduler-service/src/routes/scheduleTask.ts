
import { Router } from "express";
import { prisma } from "../utils/prisma";
import { v4 as uuidv4 } from "uuid";

const router = Router();

/**
 * POST /tasks
 * body: { name: string, cron: string, payload?: object }
 */
router.post("/", async (req, res) => {
  try {
    const { name, cron, payload } = req.body;

    if (!name || !cron) {
      return res.status(400).json({ error: "name and cron are required" });
    }

    const task = await prisma.scheduledTask.create({
      data: {
        id: uuidv4(),
        name,
        cron,
        payload: payload ? JSON.stringify(payload) : null,
        status: "scheduled",
        createdAt: new Date(),
      },
    });

    res.json(task);
  } catch (err) {
    console.error("Error scheduling task:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as scheduleTaskRouter };


