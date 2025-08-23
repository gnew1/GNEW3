import { Request, Response, NextFunction } from "express"; 
export function 
traceMiddleware(_req:Request,_res:Response,next:NextFunction){ next(); 
} 
 
