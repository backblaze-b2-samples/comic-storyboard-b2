"""The one non-Genblaze AI call.

Genblaze 0.3.x has no structured-text / forced-schema generation step (the
providers wrap *media* models; there is no ``chat()`` callable in the published
0.3.2 wheel — verified at build time). So the story breaker is a direct
Anthropic Claude call with forced tool use, run *before* the pipeline. Its
output (a ``PanelScript``) drives the ``.step()`` calls in ``repo/pipelines``.

See docs/features/story-breaker.md for the rationale and the Genblaze DX gap.
"""

from __future__ import annotations

from typing import Any

import anthropic

# Forced-schema for Claude tool use: characters + per-panel prompts.
PANEL_SCRIPT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "hero": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "reference_prompt": {
                    "type": "string",
                    "description": "A detailed visual prompt for a character reference sheet: "
                    "appearance, outfit, art style. Used once to anchor consistency.",
                },
            },
            "required": ["name", "reference_prompt"],
        },
        "panels": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "Visual prompt for this panel; the hero reference sheet "
                        "is supplied separately for consistency, so describe the scene/action.",
                    },
                    "caption": {"type": "string"},
                },
                "required": ["prompt"],
            },
        },
    },
    "required": ["hero", "panels"],
}

STORY_BREAKER_PROMPT = (
    "You are a comic storyboard director. Turn this story idea into exactly "
    "{panel_count} comic panels with one consistent hero character. Write a "
    "reference-sheet prompt for the hero, then a visual prompt for each panel "
    "that advances the story. Keep prompts concrete and consistent in art "
    "style.\n\nStory idea: {idea}"
)


def break_story(idea: str, panel_count: int, *, api_key: str, model: str) -> dict[str, Any]:
    """Return a PanelScript dict: ``{"hero": {...}, "panels": [{...}, ...]}``."""
    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=model,
        max_tokens=2048,
        tools=[
            {
                "name": "panel_script",
                "description": "Emit the structured comic panel script.",
                "input_schema": PANEL_SCRIPT_SCHEMA,
            }
        ],
        tool_choice={"type": "tool", "name": "panel_script"},
        messages=[
            {
                "role": "user",
                "content": STORY_BREAKER_PROMPT.format(idea=idea, panel_count=panel_count),
            }
        ],
    )
    for block in msg.content:
        if block.type == "tool_use":
            return block.input  # type: ignore[return-value]
    raise RuntimeError("story breaker returned no tool_use block")
