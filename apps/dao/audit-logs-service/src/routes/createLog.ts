
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * POST /logs
 * body: { actorId: string, action: string, resource: string, metadata?: object }
 */
router.post("/", async (req, res) => {
  try {
    const { actorId, action, resource, metadata } = req.body;

    if (!actorId || !action || !resource) {
      return res.status(400).json({ error: "actorId, action and resource are required" });
    }

    const log = await prisma.auditLog.create({
      data: {
        actorId,
        action,
        resource,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdAt: new Date(),
      },
    });

    res.json(log);
  } catch (err) {
    console.error("Error creating log:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as createLogRouter };


