from __future__ import annotations

import pytest

from app.strip import _validate_panel_url


def test_validate_panel_url_allows_public_b2_https_url() -> None:
    url = "https://f005.backblazeb2.com/file/demo-bucket/panel.png"

    assert _validate_panel_url(url) == url


@pytest.mark.parametrize(
    "url",
    [
        "http://f005.backblazeb2.com/file/demo-bucket/panel.png",
        "https://example.com/panel.png",
        "https://127.0.0.1/panel.png",
        "https://user:pass@f005.backblazeb2.com/file/demo-bucket/panel.png",
        "/file/demo-bucket/panel.png",
    ],
)
def test_validate_panel_url_rejects_untrusted_targets(url: str) -> None:
    with pytest.raises(ValueError, match="public Backblaze B2 HTTPS URL"):
        _validate_panel_url(url)
