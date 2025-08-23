import { Request, Response, NextFunction } from "express"; 
export function errorHandler(err:any, _req:Request, res:Response, 
_next:NextFunction){ 
res.status(400).json({ error: String(err.message || err) }); 
} 
