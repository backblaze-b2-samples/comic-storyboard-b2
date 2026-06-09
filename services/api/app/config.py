"""Application settings.

All B2 credentials use the standardized ``B2_*`` env var names (parent repo
standard). They are read here and passed *explicitly* into
``S3StorageBackend.for_backblaze(...)`` (see ``app/repo/storage.py``), so the
genblaze-s3 ``B2_APP_KEY`` / ``B2_KEY_ID`` env fallback never fires.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo-root .env (comic-storyboard-b2/.env), resolved absolutely so Settings
# loads regardless of cwd — the README launches uvicorn from services/api.
# config.py is at services/api/app/config.py, so parents[3] is the repo root.
_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

    # --- Backblaze B2 (S3-compatible) ---
    # B2_ENDPOINT is part of the standardized B2_* env set (parent repo standard),
    # but genblaze-s3's S3StorageBackend.for_backblaze(...) derives the S3 endpoint
    # internally from B2_REGION (https://s3.<region>.backblazeb2.com) and exposes no
    # explicit endpoint override. So this field is OPTIONAL/informational here —
    # keeping it required would force users to populate a no-op value. (See
    # app/repo/storage.py, which passes region= only.)
    b2_endpoint: str | None = None
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
