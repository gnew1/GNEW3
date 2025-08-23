
import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Middleware de auditoría de seguridad
 * Registra cada petición en la base de datos para trazabilidad
 */
export async function auditLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  res.on("finish", async () => {
    try {
      await prisma.auditLog.create({
        data: {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          ip: req.ip,
          userId: (req as any).user?.id || null,
          userAgent: req.get("User-Agent") || "",
          responseTime: Date.now() - start,
        },
      });
    } catch (err) {
      console.error("Error saving audit log:", err);
    }
  });

  next();
}


