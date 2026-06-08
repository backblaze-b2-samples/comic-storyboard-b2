"""B2 storage backend + sink construction.

Storage is configured exactly once, here, and handed to ``Pipeline.run(sink=...)``.
The sample never instantiates a boto3 client itself — genblaze-s3 owns the
S3 client internally (and sets its own ``b2ai-genblaze/<version>`` user agent
on it).
"""

from __future__ import annotations

from genblaze_core import KeyStrategy, ObjectStorageSink
from genblaze_s3 import S3StorageBackend

from app.config import Settings


def make_sink(s: Settings) -> ObjectStorageSink:
    """Build a content-addressed B2 sink from settings.

    Credentials are passed as explicit ``key_id=`` / ``app_key=`` kwargs, so
    genblaze-s3's ``B2_KEY_ID`` / ``B2_APP_KEY`` env fallback never fires — the
    sample's standardized ``B2_APPLICATION_KEY_ID`` / ``B2_APPLICATION_KEY`` are
    the single source of truth.
    """
    backend = S3StorageBackend.for_backblaze(
        s.b2_bucket_name,
        key_id=s.b2_application_key_id,
        app_key=s.b2_application_key,
        region=s.b2_region,
        public_url_base=s.b2_public_url_base,
    )
    # HIERARCHICAL keys give human-browsable B2 object paths; the manifest still
    # carries the SHA-256 content hash for provenance.
    return ObjectStorageSink(backend, key_strategy=KeyStrategy.HIERARCHICAL)
