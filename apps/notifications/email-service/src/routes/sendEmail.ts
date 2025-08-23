
import { Router } from "express";
import { sendEmail } from "../utils/mailer";

const router = Router();

/**
 * POST /email/send
 * body: { to: string, subject: string, text?: string, html?: string }
 */
router.post("/send", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: "to and subject are required" });
    }

    const result = await sendEmail({ to, subject, text, html });
    res.json({ success: true, info: result });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as sendEmailRouter };


