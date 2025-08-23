
import rateLimit from "express-rate-limit";

/**
 * Límite de peticiones por IP para prevenir abuso
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 peticiones por minuto
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests, slow down." });
  },
});


