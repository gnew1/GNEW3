
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * DELETE /tasks/:id
 * cancel a scheduled task
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.scheduledTask.update({
      where: { id },
      data: { status: "canceled" },
    });

    res.json(task);
  } catch (err) {
    console.error("Error canceling task:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as cancelTaskRouter };


