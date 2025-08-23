import { Request, Response, NextFunction } from "express"; 
export function requireSubjectAuth(req: Request, res: Response, next: 
NextFunction) { 
// Validación: sesión o firma de wallet/email (reutilizar flujo DID 
de N56 si está disponible). 
next(); 
} 
export function requireAdmin(_req: Request, _res: Response, next: 
NextFunction) { 
// Validación: rol staff/privacidad vía OIDC/claims 
next(); 
} 
