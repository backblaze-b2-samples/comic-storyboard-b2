# Feature: LLM story breaker

Turns a one- or two-sentence idea into a structured `PanelScript` — a hero
character (name + reference-sheet prompt) and a visual prompt per panel — that
drives the rest of the pipeline.

## How it works

`app/story_breaker.py` calls Anthropic Claude with **forced tool use**:

- A single tool, `panel_script`, whose `input_schema` (`PANEL_SCRIPT_SCHEMA`)
  fixes the output shape.
- `tool_choice={"type": "tool", "name": "panel_script"}` forces the model to
  emit that schema rather than free text.
- The handler reads the `tool_use` block's `input` — a dict matching the schema.

The result feeds `repo/pipelines.build_comic()`: `script["hero"]["reference_prompt"]`
drives step 0, and each `script["panels"][i]["prompt"]` drives a panel step.

## Why this is NOT a Genblaze step

This is the one deliberate non-Genblaze AI call in the sample.

Genblaze 0.3.x providers wrap **media** generation models (image / video /
audio). They do not offer a structured-text / forced-schema generation step, and
the installed `genblaze-core==0.3.2` wheel exposes **no `chat()` callable** (the
import fails — re-verified at build time). So there is no in-pipeline way to get
schema-forced JSON out of an LLM today.

Because of that, the story breaker:

- runs **before** the pipeline (it produces the data the pipeline consumes), and
- lives in `app/story_breaker.py`, **outside** `app/repo/`, since it is not a
  Genblaze call (and the structure test forbids `genblaze_*` imports outside
  `repo/`).

## DX note for the Genblaze team

If a future release adds a schema-forced text step (or `chat()` gains
forced-tool-use output), this call collapses into a pipeline step and moves
under `repo/` — at which point the whole prompt→panels flow would be one chain.
