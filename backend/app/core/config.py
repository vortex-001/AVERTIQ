import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Avertiq"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "avertiq-production-secret-key-disaster-intel-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./avertiq.db")
    
    # Default Map Coordinates (Ludhiana, Punjab, India per specification)
    DEFAULT_MAP_LAT: float = 30.9010
    DEFAULT_MAP_LON: float = 75.8573
    DEFAULT_MAP_ZOOM: float = 12
    DEFAULT_RADIUS_KM: float = 5.0
    
    # Telegram Bot
    TELEGRAM_BOT_TOKEN: Optional[str] = os.getenv("TELEGRAM_BOT_TOKEN", None)
    TELEGRAM_WEBHOOK_SECRET: str = os.getenv("TELEGRAM_WEBHOOK_SECRET", "avertiq-webhook-secret-token")
    
    # Gemini AI
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    
    # External Hazard Feeds (Free / Open endpoints)
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    USGS_EARTHQUAKE_FEED_URL: str = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    GDACS_FEED_URL: str = "https://www.gdacs.org/xml/rss.xml"
    NASA_FIRMS_API_KEY: Optional[str] = os.getenv("NASA_FIRMS_API_KEY", None)
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # Demo Mode
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
