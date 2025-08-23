from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "sqlite:///./feedback.db"
    log_level: str = "INFO"
    webhook_outbound_url: str | None = None
    jwt_audience: str = "gnew"
    jwt_issuer: str = "gnew-gateway"

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()

