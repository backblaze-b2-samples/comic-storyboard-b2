"""Application settings.

All B2 credentials use the standardized ``B2_*`` env var names (parent repo
standard). They are read here and passed *explicitly* into
``S3StorageBackend.for_backblaze(...)`` (see ``app/repo/storage.py``), so the
genblaze-s3 ``B2_APP_KEY`` / ``B2_KEY_ID`` env fallback never fires.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Backblaze B2 (S3-compatible) ---
    b2_endpoint: str
    b2_region: str
    b2_application_key_id: str
    b2_application_key: str
    b2_bucket_name: str
    # Public base URL for the bucket (e.g. https://<bucket>.s3.<region>.backblazeb2.com).
    # Used so generated assets get durable public URLs the strip exporter can fetch.
    b2_public_url_base: str

    # --- Providers ---
    replicate_api_token: str
    anthropic_api_key: str

    # Model used by the story breaker (Anthropic Claude, schema-forced tool use).
    story_breaker_model: str = "claude-sonnet-4-6"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
