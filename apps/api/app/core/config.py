from __future__ import annotations

import json
from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "postgresql+asyncpg://shape_cake:change-me@localhost:5432/shape_cake"
    session_cookie_name: str = "shape_cake_session"
    session_hash_pepper: str = "dev-only-change-me"
    session_idle_timeout_seconds: int = 1800
    session_absolute_timeout_seconds: int = 86400
    session_cookie_secure: bool = False
    session_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    session_cookie_domain: str | None = None
    allowed_frontend_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"]
    )
    media_root: str = "storage/media"
    media_public_base_url: str = "/api/media"
    max_upload_bytes: int = 5 * 1024 * 1024

    @field_validator("allowed_frontend_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                try:
                    decoded = json.loads(stripped)
                except json.JSONDecodeError as exc:
                    raise ValueError("ALLOWED_FRONTEND_ORIGINS must be comma-separated or a JSON array") from exc
                if not isinstance(decoded, list) or not all(
                    isinstance(origin, str) for origin in decoded
                ):
                    raise ValueError("ALLOWED_FRONTEND_ORIGINS JSON value must be an array of strings")
                return [origin.strip() for origin in decoded if origin.strip()]
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        if not isinstance(value, list) or not all(isinstance(origin, str) for origin in value):
            raise ValueError("ALLOWED_FRONTEND_ORIGINS must be comma-separated or a list of strings")
        return value

    @model_validator(mode="after")
    def validate_production_security(self) -> Settings:
        if self.app_env == "production":
            if not self.session_cookie_secure:
                raise ValueError("SESSION_COOKIE_SECURE=true is required in production")
            if self.session_hash_pepper in {"", "dev-only-change-me", "replace-with-a-long-random-secret"}:
                raise ValueError("SESSION_HASH_PEPPER must be a real secret in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
