"""Inbound request bodies only.

These are the *only* Pydantic models the sample defines. Responses return
Genblaze models (``Run`` / ``Step`` / ``Asset`` / ``Manifest``) directly — we
never mirror Genblaze DTOs. See ``app/main.py`` response models.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class StoryRequest(BaseModel):
    """A one- or two-sentence story idea plus generation options."""

    idea: str = Field(..., min_length=4, max_length=600, examples=["A lonely lighthouse keeper befriends a storm-petrel."])
    panel_count: int = Field(4, ge=2, le=8, description="Number of comic panels to generate.")


class VariantRequest(BaseModel):
    """Regenerate a single panel as a child run carrying parent lineage."""

    parent_run_id: str = Field(..., description="run_id of the run whose panel is being re-rolled.")
    panel_prompt: str = Field(..., min_length=4, max_length=600)


class StripRequest(BaseModel):
    """Compose a downloadable PNG strip from durable B2 image URLs."""

    panel_urls: list[str] = Field(..., min_length=2, max_length=8)
