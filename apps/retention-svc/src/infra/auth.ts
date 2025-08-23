import { Request, Response, NextFunction } from "express"; 
export function requireAdmin(_req: Request, _res: Response, next: 
NextFunction) { next(); } 
 
 
Motor de políticas y enforcement 
