
/**
 * GNEW · N356 — Middleware de gestión centralizada de errores
 * Objetivo: Proveer un manejador de errores consistente para todas las rutas Express.
 */

import { Request, Response, NextFunction } from "express";

interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  if (process.env.NODE_ENV !== "production") {
    console.error(`[ErrorHandler] ${status}:`, err);
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      details: err.details || null,
    },
  });
}


