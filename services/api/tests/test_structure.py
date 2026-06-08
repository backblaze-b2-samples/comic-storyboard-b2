"""Structural / ethos guardrails — these run in CI, no credentials needed.

They assert the two architectural invariants of this sample:

1. No file under ``app/`` imports boto3 or botocore. Storage is *delegated* to
   genblaze-s3, which owns the only S3 client (and sets its own user agent).
2. ``genblaze_*`` is imported ONLY under ``app/repo/`` — the rest of the app
   (routes, story breaker, strip, config, schemas) is Genblaze-agnostic.
"""

from __future__ import annotations

import re
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent / "app"
REPO_DIR = APP_DIR / "repo"

_BOTO_PATTERNS = [
    re.compile(r"^\s*import\s+boto3\b", re.MULTILINE),
    re.compile(r"^\s*from\s+boto3\b", re.MULTILINE),
    re.compile(r"^\s*import\s+botocore\b", re.MULTILINE),
    re.compile(r"^\s*from\s+botocore\b", re.MULTILINE),
]
_GENBLAZE_PATTERNS = [
    re.compile(r"^\s*import\s+genblaze\w*", re.MULTILINE),
    re.compile(r"^\s*from\s+genblaze\w*", re.MULTILINE),
]


def _py_files() -> list[Path]:
    return [p for p in APP_DIR.rglob("*.py") if "__pycache__" not in p.parts]


def test_no_boto3_or_botocore_anywhere_in_app() -> None:
    offenders: list[str] = []
    for path in _py_files():
        text = path.read_text(encoding="utf-8")
        for pat in _BOTO_PATTERNS:
            if pat.search(text):
                offenders.append(f"{path.relative_to(APP_DIR.parent)} matched {pat.pattern!r}")
    assert not offenders, (
        "boto3/botocore must never be imported in sample source — storage is "
        f"delegated to genblaze-s3. Offenders: {offenders}"
    )


def test_genblaze_imports_only_under_repo() -> None:
    offenders: list[str] = []
    for path in _py_files():
        if REPO_DIR in path.parents:
            continue
        text = path.read_text(encoding="utf-8")
        for pat in _GENBLAZE_PATTERNS:
            if pat.search(text):
                offenders.append(f"{path.relative_to(APP_DIR.parent)} imports genblaze outside repo/")
    assert not offenders, (
        "genblaze_* may only be imported under app/repo/. Offenders: " f"{offenders}"
    )
