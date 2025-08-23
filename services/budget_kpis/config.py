from pydantic_settings import BaseSettings, SettingsConfigDict 
 
class Settings(BaseSettings): 
    environment: str = "dev" 
    rpc_url: str = "http://localhost:8545" 
    registry_addr: str 
    vault_addr: str 
    # informe trimestral 
    target_fy: int = 2025 
    quarter: int = 1  # 1..4 
    # prom 
    metrics_port: int = 8030 
    model_config = SettingsConfigDict(env_file=".env", extra="ignore") 
 
settings = Settings() 
 
