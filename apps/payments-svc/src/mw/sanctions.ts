import { NextFunction, Request, Response } from "express"; 
import { ensureNotSanctioned } from 
"../../../packages/screening-guard/src"; 
 
export async function sanctionsGate(req: Request, res: Response, next: 
NextFunction) { 
  try { 
    const subjectId = req.headers["x-subject"] as string; 
    await ensureNotSanctioned(subjectId); 
    next(); 
  } catch (e:any) { 
    if (String(e.message).includes("BLOCKED")) return 
res.status(451).json({ error: "Subject blocked by sanctions 
screening." }); 
    if (String(e.message).includes("REVIEW")) return 
res.status(423).json({ error: "Subject requires compliance review." 
}); 
    next(e); 
  } 
} 
 
 
CI/CD (GitHub Actions) 
