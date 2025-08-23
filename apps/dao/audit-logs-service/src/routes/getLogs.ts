
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * GET /logs/:resource
 * returns list of logs for a resource
 */
router.get("/:resource", async (req, res) => {
  try {
    const { resource } = req.params;

    const logs = await prisma.auditLog.findMany({
      where: { resource },
      orderBy: { createdAt: "desc" },
    });

    res.json(logs);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as getLogsRouter };


