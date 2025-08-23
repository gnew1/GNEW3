
import { Router } from "express";

export const alertsRouter = Router();

interface Alert {
  id: string;
  type: string;
  message: string;
  level: "info" | "warning" | "critical";
  createdAt: number;
}

const alerts: Alert[] = [];

alertsRouter.post("/", (req, res) => {
  const { type, message, level } = req.body;

  if (!type || !message || !level) {
    return res.status(400).json({ error: "type, message and level are required." });
  }

  const newAlert: Alert = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    type,
    message,
    level,
    createdAt: Date.now(),
  };

  alerts.push(newAlert);
  res.status(201).json(newAlert);
});

alertsRouter.get("/", (_req, res) => {
  res.json(alerts);
});


