import { Request, Response, NextFunction } from "express"; 
import { decideAccess } from "../../../packages/policy-guard/src"; 
 
export async function opaAccess(req: Request, res: Response, next: 
NextFunction) { 
  try { 
    const subject = { 
      id: req.headers["x-subject-id"] as string, 
      roles: (req.headers["x-roles"] as string || 
"").split(",").filter(Boolean), 
      sanctions_status: req.headers["x-sanctions-status"] || "clear", 
      authenticated: Boolean(req.headers["authorization"]) 
    }; 
    const input = { 
      subject, 
      action: req.method === "GET" ? "read" : req.method === "POST" ? 
"write" : "manage", 
      resource: { type: "api", owner: subject.id, sensitivity: 
"medium", region: (req.headers["x-region"] as string) || "EU" }, 
      env: { ip_country: (req.headers["x-ip-country"] as string) || 
"EU", mfa: (req.headers["x-mfa"] as string) || "absent" } 
    }; 
    const d = await decideAccess(input); 
    if (!d.allow) return res.status(403).json({ error: d.reason || 
"forbidden" }); 
    if (d.obligations?.includes("step_up_mfa")) return 
res.status(401).json({ error: "mfa_required" }); 
    next(); 
  } catch (e:any) { 
    next(e); 
  } 
} 
 
