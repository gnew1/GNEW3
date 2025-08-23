
/**
 * GNEW · N354 — Middleware de Autenticación
 * Objetivo: Middleware Express para validar tokens JWT en todas las rutas protegidas.
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "gnew_default_secret";

export interface AuthRequest extends Request {
  user?: { id: string; role?: string };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token inválido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token no autorizado" });
  }
};


