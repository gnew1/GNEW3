from pydantic_settings import BaseSettings, SettingsConfigDict 
 
class Settings(BaseSettings): 
    environment: str = "dev" 
    # datasource del subledger (N102): CSV/Parquet/DB API 
    subledger_path: str = "./data/subledger.csv" 
    # almacenamiento simple (sqlite) para consentimientos 
    sqlite_path: str = "./data/tax_engine.db" 
    # directorio de salida de informes 
    out_dir: str = "./out" 
    model_config = SettingsConfigDict(env_file=".env", extra="ignore") 
 
settings = Settings() 
 
 
