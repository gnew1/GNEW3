
import { RateLimiterMemory } from "rate-limiter-flexible";
import { cfg } from "./config.js";
import { Request, Response, NextFunction } from "express";

const rlIp = new RateLimiterMemory({ points: cfg.limits.perIpPerMin, duration: 60 });
const rlWallet = new RateLimiterMemory({ points: cfg.limits.perWalletPerHour, duration: 3600 });

export async function limitByIp(req: Request, res: Response, next: NextFunction) {
  try { await rlIp.consume(req.ip); next(); }
  catch { res.status(429).json({ error: "rate_limited_ip" }); }
}

export async function limitByWallet(req: Request, res: Response, next: NextFunction) {
  const walletId = (req.body?.walletId || req.query?.walletId || req.body?.walletAddress) as string | undefined;
  if (!walletId) return next();
  try { await rlWallet.consume(walletId); next(); }
  catch { res.status(429).json({ error: "rate_limited_wallet" }); }
}


