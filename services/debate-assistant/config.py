from pydantic_settings import BaseSettings, SettingsConfigDict 
 
class Settings(BaseSettings): 
    service_name: str = "debate-assistant" 
    environment: str = "dev" 
 
    # DB 
    database_url: str = "sqlite:///./debate_assistant.db" 
 
    # Indexado / NLP 
    min_docs_for_topics: int = 8 
    max_summary_sentences: int = 6 
    top_k_passages: int = 6 
    top_k_args: int = 5 
    topic_k: int = 8 
 
    # Rate limits (placeholder para gateway) 
    max_ingest_payload_kb: int = 1024 
 
    # NATS / Matrix opcionales 
    enable_nats: bool = False 
    nats_url: str = "nats://nats:4222" 
 
    model_config = SettingsConfigDict(env_file=".env", extra="ignore") 
 
settings = Settings() 
 
 
