
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * GET /alerts?type=email&limit=20
 */
router.get("/", async (req, res) => {
  try {
    const { type, limit } = req.query;

    const where: any = {};
    if (type) where.type = type;

    const results = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json(results);
  } catch (err) {
    console.error("Error fetching alerts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as listAlertsRouter };


