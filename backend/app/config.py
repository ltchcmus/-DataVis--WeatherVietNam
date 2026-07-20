from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # === AI / Gemini ===
    gemini_api_key: str = ""           # Legacy single key (backward compat)
    gemini_api_keys: str = ""          # Comma-separated: "key1,key2,key3"
    gemini_model: str = "gemini-2.5-flash"
    gemini_max_retries: int = 3
    gemini_base_backoff_seconds: float = 1.0
    gemini_max_backoff_seconds: float = 60.0
    gemini_max_history_turns: int = 15     # Giới hạn số lượt chat (1 lượt = 1 user + 1 assistant)

    # === Database ===
    database_url: str
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # === Redis (Standalone) ===
    redis_url: str = ""                # redis.io free tier URL (overrides host/port)
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str = ""

    # === Rate Limiting ===
    rate_limit_requests: int = 30
    rate_limit_window_seconds: int = 60

    # === Logging ===
    log_level: str = "INFO"
    log_dir: str = "logs"
    log_max_bytes: int = 10 * 1024 * 1024  # 10MB
    log_backup_count: int = 5
    log_retention_days: int = 30

    # === Dataset ===
    dataset_path: str = "data/dataset.csv"
    cities_scope: str = "vietnam"      # "vietnam" | "all"

    # === Pipeline ===
    pipeline_cron: str = "02:00"       # HH:MM, 24h format

    # === Feature Toggles ===
    enable_auto_execute: bool = False   # True = approve chạy code server
    app_env: str = "development"

    def get_gemini_keys(self) -> List[str]:
        """Trả về danh sách Gemini API keys (ưu tiên gemini_api_keys)."""
        if self.gemini_api_keys:
            keys = [k.strip() for k in self.gemini_api_keys.split(",") if k.strip()]
            if keys:
                return keys
        if self.gemini_api_key:
            return [self.gemini_api_key]
        return []

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
