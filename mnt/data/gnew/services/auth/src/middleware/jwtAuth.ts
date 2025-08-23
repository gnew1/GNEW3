
/**
 * GNEW Project - JWT Authentication Middleware
 * Prompt N311
 * Provides request authentication using JSON Web Tokens (JWT).
 */

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { logger } from "../utils/logger";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload | string;
}

const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  logger.error("JWT_SECRET is not defined in environment variables");
  throw new Error("JWT_SECRET missing");
}

/**
 * Middleware to verify JWT token in Authorization header.
 */
export function jwtAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token missing" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn("JWT authentication failed", { error: err });
    res.status(403).json({ error: "Invalid or expired token" });
  }
}


