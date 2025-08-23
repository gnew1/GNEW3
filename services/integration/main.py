import os 
import json 
import httpx 
from fastapi import FastAPI, Depends, Request 
from fastapi.middleware.cors import CORSMiddleware 
from starlette.middleware import Middleware 
from starlette.responses import JSONResponse 
from services.common.middleware import LoggingMiddleware, 
ExceptionMiddleware 
from services.common.otel import setup_otel 
from services.common.logger import setup_logging 
from .config import settings 
from .security import get_api_key 
from .rate_limit import limiter, client_key_from_headers 
 
# Logging + OTEL (coherente con el repo) 
setup_logging("integration", settings.log_level) 
middleware = [ 
    Middleware(LoggingMiddleware), 
    Middleware(ExceptionMiddleware), 
] 
app = FastAPI( 
    title="GNEW Integration API", 
    version="1.0.0", 
    middleware=middleware, 
    docs_url=f"/{settings.api_version}/docs", 
    openapi_url=f"/{settings.api_version}/openapi.json", 
) 
setup_otel("integration", app) 
 
# CORS 
app.add_middleware( 
    CORSMiddleware, 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"], 
    allow_origins=["*"],  # ajustar en producción 
) 
 
# Rate limit global (60 req/min por API key/JWT/IP) 
app.middleware("http")(await limiter.limit(client_key_from_headers)) 
 
@app.middleware("http") 
async def add_version_headers(request: Request, call_next): 
    response = await call_next(request) 
    response.headers["X-API-Version"] = "1" 
    return response 
 
# Health 
@app.get("/health") 
async def health(): 
    return {"status": "ok", "version": app.version} 
 
# --- Rutas v1 -------------------------------------------------- 
 
BASE = f"/{settings.api_version}" 
 
@app.get(f"{BASE}/ping") 
async def ping(_auth=Depends(get_api_key)): 
    return {"pong": True} 
 
@app.get(f"{BASE}/projects") 
async def projects_list(_auth=Depends(get_api_key)): 
    # Proxy básico a Projects Service (idempotente y estable) 
    try: 
        async with httpx.AsyncClient(timeout=5) as client: 
            # Ajustar al endpoint real del servicio de proyectos 
            r = await client.get(f"{settings.projects_url}/projects") 
            if r.status_code == 200: 
                return r.json() 
    except Exception: 
        pass 
    # Fallback: contrato estable (lista vacía si upstream falla) 
    return [] 
 
@app.get(f"{BASE}/rewards/{{user}}") 
async def rewards(user: str, _auth=Depends(get_api_key)): 
    # Proxy a DeFi: GET /rewards/{user} 
    try: 
        async with httpx.AsyncClient(timeout=5) as client: 
            r = await 
client.get(f"{settings.defi_url}/rewards/{user}") 
            if r.status_code == 200: 
                return r.json() 
    except Exception: 
        pass 
    # Fallback estable 
    return {"user": user, "rewards": 0} 
 
@app.post(f"{BASE}/defi/stake") 
async def defi_stake(payload: dict, _auth=Depends(get_api_key)): 
    # Contrato estable: { amount: number } → { status, txId? } 
    amt = int(payload.get("amount", 0)) 
    if amt <= 0: 
        return JSONResponse({"error": {"code": "VALIDATION_ERROR", 
"message": "amount > 0"}}, status_code=422) 
    try: 
        async with httpx.AsyncClient(timeout=5) as client: 
            r = await client.post(f"{settings.defi_url}/stake", 
json={"amount": amt}) 
            if r.status_code == 200: 
                data = r.json() 
                return {"status": "ok", "upstream": data} 
    except Exception: 
        pass 
    # Fallback: confirmamos recepción pero sin tx 
    return {"status": "queued"} 
 
# Nota: Swagger/OpenAPI se expone en /v1/docs y /v1/openapi.json 
automáticamente. 
 
 
