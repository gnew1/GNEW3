
import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

/**
 * POST /alerts
 * body: { type: "email" | "sms" | "push", target: string, message: string }
 */
router.post("/", async (req, res) => {
  try {
    const { type, target, message } = req.body;

    if (!type || !target || !message) {
      return res
        .status(400)
        .json({ error: "type, target and message are required" });
    }

    const alert = await prisma.alert.create({
      data: { type, target, message },
    });

    // Simulación de envío (aquí se integrarían proveedores como Twilio, SendGrid, etc.)
    console.log(`Sending ${type} alert to ${target}: ${message}`);

    res.status(201).json(alert);
  } catch (err) {
    console.error("Error creating alert:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as sendAlertRouter };


