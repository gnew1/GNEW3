import time 
from typing import Callable 
from fastapi import Request, HTTPException 
import aioredis 
from .config import settings 
 
class RateLimiter: 
    def __init__(self): 
        self.redis = None 
 
    async def init(self): 
        if not self.redis: 
            self.redis = await aioredis.from_url(settings.redis_url, 
encoding="utf-8", decode_responses=True) 
 
    async def close(self): 
        if self.redis: 
            await self.redis.close() 
 
    async def limit(self, key_func: Callable[[Request], str]): 
        await self.init() 
        async def middleware(request: Request, call_next): 
            key_base = key_func(request) 
            window = settings.rate_limit_window_seconds 
            now = int(time.time()) 
            bucket = f"rl:{key_base}:{now // window}" 
            ttl = window 
            count = await self.redis.incr(bucket) 
            if count == 1: 
                await self.redis.expire(bucket, ttl) 
            if count > settings.rate_limit_requests: 
                raise HTTPException(status_code=429, 
detail="RATE_LIMIT_EXCEEDED") 
            response = await call_next(request) 
            # Headers de visibilidad 
            remaining = max(settings.rate_limit_requests - count, 0) 
            response.headers["X-RateLimit-Limit"] = 
str(settings.rate_limit_requests) 
            response.headers["X-RateLimit-Remaining"] = str(remaining) 
            response.headers["X-RateLimit-Reset"] = str(((now // 
window) + 1) * window) 
            return response 
        return middleware 
 
limiter = RateLimiter() 
 
def client_key_from_headers(req: Request) -> str: 
    api_key = req.headers.get("x-api-key") or "" 
    auth = req.headers.get("authorization") or "" 
    ip = req.client.host if req.client else "unknown" 
    return api_key or auth or ip 
 
 
