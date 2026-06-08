"""FastAPI surface for comic-storyboard-b2.

Handlers return Genblaze models (``Run`` / ``Manifest``) directly — no mirrored
DTOs. They never import ``genblaze_*`` themselves: all Genblaze access is
transitive through ``app.repo.*``, which keeps the SDK confined to one package
(enforced by tests/test_structure.py). The returned objects are Pydantic
models, so FastAPI serializes them with no extra glue.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.repo import pipelines, storage
from app.schemas import StoryRequest, StripRequest, VariantRequest
from app.story_breaker import break_story
from app.strip import compose_strip

app = FastAPI(
    title="comic-storyboard-b2",
    description="Genblaze-driven comic/storyboard generation persisted to Backblaze B2.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/storyboards")
def create_storyboard(req: StoryRequest):
    """Idea -> Claude script -> hero ref sheet + fan-out panels -> persisted on B2.

    Returns the Genblaze ``Run`` plus its content-addressed ``Manifest``.
    """
    s = get_settings()
    script = break_story(
        req.idea,
        req.panel_count,
        api_key=s.anthropic_api_key,
        model=s.story_breaker_model,
    )
    sink = storage.make_sink(s)
    try:
        run, manifest = pipelines.build_comic(
            script, sink, replicate_token=s.replicate_api_token
        )
    except Exception as exc:  # surface provider/pipeline failures as 502
        raise HTTPException(status_code=502, detail=f"generation failed: {exc}") from exc
    return {"run": run, "manifest": manifest}


@app.post("/storyboards/variants")
def regenerate_panel(req: VariantRequest):
    """Re-roll a single panel as a child run carrying ``parent_run_id`` lineage."""
    s = get_settings()
    sink = storage.make_sink(s)
    try:
        run, manifest = pipelines.regenerate_panel(
            req.parent_run_id,
            req.panel_prompt,
            sink,
            replicate_token=s.replicate_api_token,
        )
    except KeyError:
        raise HTTPException(
            status_code=404, detail=f"unknown parent_run_id {req.parent_run_id!r}"
        ) from None
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"variant failed: {exc}") from exc
    return {"run": run, "manifest": manifest}


@app.post("/strip")
def export_strip(req: StripRequest) -> Response:
    """Compose the panels (fetched from their durable B2 URLs) into one PNG."""
    try:
        png = compose_strip(req.panel_urls)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"strip compose failed: {exc}") from exc
    return Response(
        content=png,
        media_type="image/png",
        headers={"Content-Disposition": 'attachment; filename="storyboard.png"'},
    )
