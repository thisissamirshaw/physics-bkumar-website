from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent

DEFAULT_SECRET = "dev-secret-change-me"
DEFAULT_SUPERADMIN_EMAIL = "superadmin@example.com"
DEFAULT_SUPERADMIN_PASSWORD = "12345678"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    app_env: str = "development"  # "production" refuses to start with the default SECRET_KEY
    database_url: str = f"sqlite:///{BACKEND_DIR / 'physics.db'}"
    secret_key: str = DEFAULT_SECRET

    # The super admin account is created from these the first time the server starts
    # (and by `python -m app.reset_admin`). After that the email and password live in
    # the database and are changed from the console: Account & security.
    superadmin_email: str = DEFAULT_SUPERADMIN_EMAIL
    superadmin_password: str = DEFAULT_SUPERADMIN_PASSWORD

    token_ttl_hours: int = 12
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://thisissamirshaw.github.io",
    ]
    frontend_dist: Path = PROJECT_DIR / "frontend" / "dist"

    # Abuse protection for public forms: max requests per IP per window.
    enquiry_limit: int = 5
    login_limit: int = 10
    rate_window_seconds: int = 600

    def check(self) -> list[str]:
        problems = []
        if self.secret_key == DEFAULT_SECRET:
            problems.append("SECRET_KEY is the default value")
        return problems


@lru_cache
def get_settings() -> Settings:
    return Settings()
