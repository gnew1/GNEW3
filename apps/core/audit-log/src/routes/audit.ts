
import { Router } from "express";
import { saveAuditEntry, getAuditEntries } from "../services/auditService";

const router = Router();

/**
 * POST /audit/log
 * body: { action: string, userId: string, details?: any }
 */
router.post("/log", async (req, res) => {
  try {
    const { action, userId, details } = req.body;

    if (!action || !userId) {
      return res.status(400).json({ error: "action and userId are required" });
    }

    const entry = await saveAuditEntry(action, userId, details || {});
    res.json({ success: true, entry });
  } catch (err) {
    console.error("Error saving audit entry:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /audit/:userId
 */
router.get("/:userId", async (req, res) => {
  try {
    const entries = await getAuditEntries(req.params.userId);
    res.json(entries);
  } catch (err) {
    console.error("Error fetching audit entries:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as auditRouter };


