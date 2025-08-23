
/**
 * GNEW Project - Token Manager Utility
 * Prompt N312
 * Centralized utilities for creating and verifying access/refresh tokens.
 */

import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { logger } from "./logger";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  logger.error("JWT secrets are not defined in environment variables");
  throw new Error("JWT secrets missing");
}

const accessTokenExpiry = "15m"; // short-lived
const refreshTokenExpiry = "30d"; // long-lived

/**
 * Generate an access token for a given payload.
 */
export function generateAccessToken(payload: object): string {
  const options: SignOptions = { expiresIn: accessTokenExpiry };
  return jwt.sign(payload, ACCESS_SECRET, options);
}

/**
 * Generate a refresh token for a given payload.
 */
export function generateRefreshToken(payload: object): string {
  const options: SignOptions = { expiresIn: refreshTokenExpiry };
  return jwt.sign(payload, REFRESH_SECRET, options);
}

/**
 * Verify and decode an access token.
 */
export function verifyAccessToken(token: string): JwtPayload | string {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (err) {
    logger.warn("Access token verification failed", { error: err });
    throw new Error("Invalid or expired access token");
  }
}

/**
 * Verify and decode a refresh token.
 */
export function verifyRefreshToken(token: string): JwtPayload | string {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    logger.warn("Refresh token verification failed", { error: err });
    throw new Error("Invalid or expired refresh token");
  }
}


