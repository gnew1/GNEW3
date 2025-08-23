
import { Router } from "express";
import { assignReward, getGuildRewards } from "../services/rewardService";

const router = Router();

/**
 * GET /rewards/:guildId
 * Fetch all rewards assigned within a guild
 */
router.get("/:guildId", async (req, res) => {
  try {
    const { guildId } = req.params;
    const rewards = await getGuildRewards(guildId);
    res.json(rewards);
  } catch (err) {
    console.error("Error fetching rewards:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /rewards/assign
 * body: { guildId: string, memberId: string, token: string, amount: number }
 */
router.post("/assign", async (req, res) => {
  try {
    const { guildId, memberId, token, amount } = req.body;
    if (!guildId || !memberId || !token || typeof amount !== "number") {
      return res
        .status(400)
        .json({ error: "guildId, memberId, token and amount are required" });
    }
    const updated = await assignReward(guildId, memberId, token, amount);
    res.json(updated);
  } catch (err) {
    console.error("Error assigning reward:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as rewardsRouter };


