
/**
 * GNEW · N349 — Role-Based Access Control (RBAC) Middleware
 * Rol: Backend + Seguridad
 * Objetivo: Implementar un middleware RBAC para proteger rutas sensibles de la DAO.
 */

import { Request, Response, NextFunction } from "express";

export type Role = "member" | "moderator" | "admin";

interface User {
  id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function requireRole(required: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const roleHierarchy: Record<Role, number> = {
      member: 1,
      moderator: 2,
      admin: 3,
    };
    if (roleHierarchy[user.role] < roleHierarchy[required]) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  };
}


