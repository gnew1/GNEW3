from pydantic_settings import BaseSettings, SettingsConfigDict 
 
class Settings(BaseSettings): 
    environment: str = "dev" 
    rpc_url: str = "http://localhost:8545" 
    chain_id: int = 31337 
    keeper_private_key: str = "0x"+"0"*64 
    vault_address: str | None = None 
    # Orquestación 
    strategies_yaml: str = 
"./services/treasury_strats/strategies.yaml" 
    # Métricas 
    prometheus_port: int = 8017 
    model_config = SettingsConfigDict(env_file=".env", extra="ignore") 
 
settings = Settings() 
 
