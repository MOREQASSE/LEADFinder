import os
from pathlib import Path
from pydantic_settings import BaseSettings

_BACKEND_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    SECRET_KEY: str = "change-me-in-production"
    DATABASE_URL: str = f"sqlite+aiosqlite:///{_BACKEND_DIR / 'Devaxio.db'}"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    GMAIL_EMAIL: str = ""
    GMAIL_APP_PASSWORD: str = ""

    OPENROUTER_API_KEY: str = ""
    GITHUB_MODELS_TOKEN: str = ""

    REDDIT_CLIENT_ID: str = ""
    REDDIT_CLIENT_SECRET: str = ""
    REDDIT_USER_AGENT: str = "DevaxioLEADFinder/1.0"

    MASTODON_ACCESS_TOKEN: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
