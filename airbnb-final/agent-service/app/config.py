from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseModel):
    port: int = int(os.getenv("PORT", "8088"))
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

    openai_api_key: str | None = os.getenv("OPENAI_API_KEY") or None
    anthropic_api_key: str | None = os.getenv("ANTHROPIC_API_KEY") or None
    tavily_api_key: str | None = os.getenv("TAVILY_API_KEY") or None

    # Dynamic place fetch config
    radius_km: float = float(os.getenv("RADIUS_KM", "5"))         # initial radius
    max_radius_km: float = float(os.getenv("MAX_RADIUS_KM", "15"))# we’ll expand up to this
    max_pois: int = int(os.getenv("MAX_POIS", "40"))
    max_restaurants: int = int(os.getenv("MAX_RESTAURANTS", "40"))

    # Try multiple Overpass mirrors to avoid rate-limits
    overpass_endpoints: list[str] = [
        # primary
        os.getenv("OVERPASS_URL", "https://overpass-api.de/api/interpreter"),
        # fallbacks
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.openstreetmap.ru/api/interpreter",
    ]

settings = Settings()
