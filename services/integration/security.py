from typing import Optional 
from fastapi import Header, HTTPException, Depends 
from jose import jwt 
import httpx 
from .config import settings 
 
def _split_api_keys() -> set[str]: 
    return set(k.strip() for k in settings.api_keys.split(",") if 
k.strip()) 
 
async def get_api_key( 
    x_api_key: Optional[str] = Header(default=None, 
alias="X-API-Key"), 
    authorization: Optional[str] = Header(default=None, 
alias="Authorization"), 
): 
    # 1) API Key (preferido para terceros) 
    if x_api_key: 
        if x_api_key in _split_api_keys(): 
            return {"type": "api_key", "sub": "api_key_user"} 
        raise HTTPException(status_code=401, detail="INVALID_API_KEY") 
 
    # 2) Bearer JWT (opcional, si integrador usa OAuth interno) 
    if authorization and authorization.lower().startswith("bearer "): 
        token = authorization.split(" ", 1)[1] 
        try: 
            async with httpx.AsyncClient(timeout=5) as client: 
                jwks = (await 
client.get(settings.auth_jwks_url)).json() 
            header = jwt.get_unverified_header(token) 
            kid = str(header.get("kid")) 
            key = next((k for k in jwks.get("keys", []) if 
k.get("kid") == kid), None) 
            if not key: 
                raise HTTPException(status_code=401, 
detail="INVALID_TOKEN") 
            payload = jwt.decode(token, key, 
algorithms=[key.get("alg", "RS256")]) 
            return {"type": "jwt", "sub": payload.get("sub", 
"unknown")} 
        except Exception: 
            raise HTTPException(status_code=401, 
detail="INVALID_TOKEN") 
    raise HTTPException(status_code=401, detail="MISSING_CREDENTIALS") 
 
 
