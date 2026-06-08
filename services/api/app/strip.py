"""The one non-Genblaze media op: compose panels into a downloadable strip.

The composed strip is a *derived* artifact. We fetch each panel's durable
**public B2 URL** (a plain HTTP GET via httpx — not boto3) and tile them with
Pillow into a single PNG returned to the client as a download. The strip is not
re-uploaded: the installed genblaze-s3 sink exposes no documented arbitrary-file
``put`` (only pipeline-asset persistence). Re-persisting the strip is a
documented future extension — see docs/features/strip-export.md.
"""

from __future__ import annotations

import io

import httpx
from PIL import Image

_GUTTER = 16
_BG = (255, 255, 255)


def compose_strip(panel_urls: list[str]) -> bytes:
    """Fetch panels from their durable B2 URLs and tile them into one PNG.

    Layout: a 2-column grid (comic-strip style). Returns PNG bytes.
    """
    images: list[Image.Image] = []
    with httpx.Client(timeout=30.0) as client:
        for url in panel_urls:
            resp = client.get(url)
            resp.raise_for_status()
            images.append(Image.open(io.BytesIO(resp.content)).convert("RGB"))

    cols = 2
    rows = (len(images) + cols - 1) // cols
    cell_w = max(im.width for im in images)
    cell_h = max(im.height for im in images)

    canvas_w = cols * cell_w + (cols + 1) * _GUTTER
    canvas_h = rows * cell_h + (rows + 1) * _GUTTER
    canvas = Image.new("RGB", (canvas_w, canvas_h), _BG)

    for i, im in enumerate(images):
        r, c = divmod(i, cols)
        x = _GUTTER + c * (cell_w + _GUTTER)
        y = _GUTTER + r * (cell_h + _GUTTER)
        canvas.paste(im, (x, y))

    out = io.BytesIO()
    canvas.save(out, format="PNG")
    return out.getvalue()
