import { Request, Response, NextFunction } from "express"; 
import { decidePayment } from "../../../packages/policy-guard/src"; 
 
export async function opaPayments(req: Request, res: Response, next: 
NextFunction) { 
  try { 
    const body = req.body; 
    const input = { 
      tx: { id: body.id, amount: body.amount, currency: body.currency, 
country_from: body.country_from, country_to: body.country_to }, 
      sender: body.sender, receiver: body.receiver, 
      risk: body.risk 
    }; 
    const d = await decidePayment(input); 
    if (!d.allow) return res.status(451).json({ error: d.reason || 
"blocked" }); 
    if (d.obligations?.includes("manual_review")) 
req.headers["x-obligation-review"] = "manual"; 
    if (d.obligations?.includes("3ds")) 
req.headers["x-obligation-3ds"] = "required"; 
    next(); 
  } catch (e:any) { next(e); } 
} 
 
 
Policy Registry (opcional para desarrollo rápido) 
