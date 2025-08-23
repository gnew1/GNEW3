from pydantic_settings import BaseSettings, SettingsConfigDict 
 
class Settings(BaseSettings): 
    # Versionado 
    api_version: str = "v1" 
 
    # Seguridad 
    api_keys: str = ""  # CSV de API keys válidas 
    auth_jwks_url: str = "http://auth:8001/jwks.json"  # opcional: 
verificación JWT 
 
    # Rate limit 
    redis_url: str = "redis://redis:6379/0" 
    rate_limit_requests: int = 60 
    rate_limit_window_seconds: int = 60 
 
    # Upstreams (REST internos) 
    projects_url: str = "http://projects:8004" 
    defi_url: str = "http://defi:8003" 
 
    # Observabilidad / logs 
    log_level: str = "INFO" 
 
    model_config = SettingsConfigDict(env_file=".env", extra="ignore") 
 
settings = Settings() 
 
 
