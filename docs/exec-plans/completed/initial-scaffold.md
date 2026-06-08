# Plan — `comic-storyboard-b2` (rebuild from scratch)

A Genblaze-based B2 sample. Scaffolded **from scratch** (no template clone).
Visual styling imported token-by-token from the vibe-coding-starter-kit.

> **REBUILD NOTE:** a complete, committed `comic-storyboard-b2` already
> exists in this directory (its own git repo, 3 commits, finalized). This
> rebuild — explicitly requested by the user — **deletes that tree** and
> re-runs the full build → review → finalize loop. The deletion happens
> only after this plan is approved, immediately before Phase 2.

> **Live-context note (re-verified against PyPI JSON API, 2026-06-08):**
> Authoritative published versions on PyPI (what `uv pip install` resolves):
> `genblaze-core` **0.3.2**, `genblaze-s3` **0.3.2**,
> `genblaze-replicate` **0.3.0**, `genblaze-openai` **0.3.0** — all
> `requires-python >=3.11`. (The GitHub README references an unreleased
> **0.3.3** tag; the build installs from PyPI, so **0.3.2 is the floor**.)
> Two findings shape this plan:
>
> 1. **No Genblaze provider does structured text/LLM inside a Pipeline.**
>    The README now documents a standalone `chat()` convenience callable
>    *outside* the Pipeline machinery, and the LLM-wrapping providers
>    (GMICloud / NVIDIA NIM → Llama/DeepSeek/Nemotron) exist to *drive
>    media steps*, not to emit structured JSON / forced-tool-use schemas.
>    So the **LLM story breaker cannot be a Genblaze step** — it is a
>    direct Anthropic Claude call that runs *before* the pipeline and
>    produces the panel script that drives the `.step()` calls. (Captured
>    as a DX gap; the builder should re-confirm `chat()` can't do
>    schema-forced output against the installed wheel.)
> 2. **`genblaze-replicate` is the right image provider** — its catalog
>    covers character-consistency models (`fofr/consistent-character`,
>    IP-Adapter / ControlNet SDXL) *and* cheap FLUX-schnell for reference
>    sheets. One image provider, two models.

---

## 1. Purpose

`comic-storyboard-b2` is a **cheap generative-media app**: describe a story
in a sentence or two and get back a multi-panel comic / storyboard whose
characters and settings stay consistent across panels. It is for developers
evaluating Genblaze who want to see the library carry an end-to-end media
workflow — LLM-driven scripting, character-consistent image generation,
durable asset persistence, and provenance — with almost no glue code. The
selling point is ergonomics: the entire generate-and-persist surface is a
single `Pipeline(...).step(...).run(sink=...)` chain; B2 storage,
content-addressing, SHA-256 manifests, fan-out concurrency, and variant
lineage all come from the library, not from sample code.

## 2. Scaffold structure (built from scratch)

```
comic-storyboard-b2/
├── apps/web/                          # Next.js 16 App Router (React 19, Tailwind v4)
│   ├── src/app/
│   │   ├── globals.css                # ← copied from starter-kit (theme tokens)
│   │   ├── layout.tsx                 # new — minimal root layout
│   │   └── page.tsx                   # new — prompt → storyboard UI (single page)
│   ├── src/components/
│   │   ├── ui/**                      # ← copied shadcn primitives (allowlist §4)
│   │   ├── story-form.tsx             # new — prompt input + options
│   │   ├── storyboard-grid.tsx        # new — panel grid, variant + export actions
│   │   └── panel-card.tsx             # new — one panel, regenerate-variant button
│   ├── src/lib/
│   │   ├── utils.ts                   # ← copied (cn helper)
│   │   └── api.ts                     # new — typed fetch wrapper to FastAPI
│   ├── components.json                # ← copied
│   ├── postcss.config.mjs             # ← copied
│   ├── next.config.ts                 # new — minimal
│   ├── package.json                   # new
│   └── tsconfig.json                  # new
│
├── services/api/                      # FastAPI; Genblaze imports ONLY under app/repo/
│   ├── app/
│   │   ├── main.py                    # FastAPI app + routes (returns Genblaze models)
│   │   ├── config.py                  # pydantic-settings: B2_*, REPLICATE_API_TOKEN, ANTHROPIC_API_KEY
│   │   ├── schemas.py                 # request bodies only (StoryRequest, VariantRequest) — NO mirrored Genblaze DTOs
│   │   ├── story_breaker.py           # Anthropic Claude call → PanelScript (the one non-Genblaze AI call)
│   │   ├── strip.py                   # Pillow strip composition (the one non-Genblaze media op)
│   │   └── repo/                      # ← ALL genblaze_* imports confined here
│   │       ├── __init__.py
│   │       ├── storage.py             # S3StorageBackend.for_backblaze + ObjectStorageSink
│   │       └── pipelines.py           # Pipeline construction (< 100 lines)
│   ├── tests/
│   │   └── test_structure.py          # asserts: no boto3/botocore imports in sample src; genblaze imports only under repo/
│   ├── pyproject.toml                 # deps + lower-bound pins (§3)
│   ├── requirements.txt               # mirror of resolved lockfile (lower-bound pins)
│   └── .python-version                # 3.11
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── app-workflows.md
│   ├── exec-plans/completed/          # this plan lands here in Phase 5
│   └── features/
│       ├── story-breaker.md
│       ├── character-consistency.md
│       ├── panel-fanout.md
│       └── strip-export.md
│
├── README.md
├── AGENTS.md
├── .env.example
└── .gitignore
```

Standard `apps/web` + `services/api` shape; no deviations.

## 3. PyPI dependencies (`uv pip install` against public PyPI)

Backend (`services/api`):

| Package | Floor (lower-bound pin) | Why |
|---|---|---|
| `genblaze-core` | `>=0.3.2` | pipeline, Modality, ObjectStorageSink, KeyStrategy, Run/Step/Asset, manifests |
| `genblaze-s3` | `>=0.3.2` | `S3StorageBackend.for_backblaze` — B2 storage |
| `genblaze-replicate` | `>=0.3.0` | `ReplicateProvider` — FLUX ref sheets + consistent-character panels |
| `anthropic` | `>=0.40` | story breaker (Genblaze has no structured-text step) |
| `fastapi` | `>=0.110` | API |
| `uvicorn[standard]` | `>=0.29` | server |
| `pydantic-settings` | `>=2.0` | `config.py` |
| `pillow` | `>=10.0` | strip composition (also a genblaze-core dep) |
| `httpx` | `>=0.24` | fetch durable B2 URLs for strip compose |

**Pinning strategy:** pinned lower bound from whatever `uv pip install`
resolves at build time, **no upper bound** in our declarations. (The
`genblaze-*` packages internally pin `<0.4`; we don't re-cap them.) Expected
floor for `genblaze-core`/`genblaze-s3` is **0.3.2** and `genblaze-replicate`
**0.3.0**; record the actual resolved versions in `requirements.txt`.

Frontend (`apps/web`): `next@16`, `react@19`, `tailwindcss@4`,
`class-variance-authority`, `tailwind-merge`, `lucide-react`, plus the Radix
peers the copied `ui/**` primitives require (builder copies the matching
versions from the starter-kit `package.json`).

## 4. Visual style import (allowlist)

Source: **`/Users/scarreras/repos/vibe-coding-starter-kit/apps/web/`**
(the kit is a sibling of `demand-side-ai`, *not* of `sampleapps` — the
default `../vibe-coding-starter-kit` path does not resolve from the sample;
use the absolute path above. Verified present this run.)

> **Deviation from the skill's default allowlist:** the kit is **Tailwind
> v4** (Next 16 / React 19). There is **no `tailwind.config.ts`** — theme
> tokens live in `globals.css` via `@theme`. PostCSS config is
> `postcss.config.mjs`, and `globals.css` is under `src/app/`, not
> `src/styles/`. Allowlist adjusted accordingly.

Copy (→ into `apps/web/`):

- `components.json`
- `postcss.config.mjs`
- `src/app/globals.css`  (theme tokens / design system)
- `src/components/ui/**`  (shadcn primitives — `button`, `card`, `input`,
  `textarea`, `dialog`, `tabs`, `badge`, `skeleton`, `tooltip`, `sonner`,
  plus `empty-state.tsx`, `error-state.tsx`, and any `generating-loader/`
  component — all useful for a media-gen UI)
- `src/lib/utils.ts`  (the `cn` helper)

**Denylist (never copied):** `src/app/**` pages/routes/layouts (except
`globals.css`), `src/lib/api-client.ts`, `queries.ts`, `query-client.tsx`,
`refresh-context.tsx`, `file-tree.ts`, any business-logic components,
`e2e/`, `playwright.config.ts`, and the kit's `services/`, `packages/`,
`infra/`, `scripts/`, MDX/docs content.

## 5. Genblaze surface

- `Pipeline(name="comic-storyboard-b2")` — name is the provenance slug.
- `.step(ReplicateProvider(), model=..., prompt=..., modality=Modality.IMAGE, aspect_ratio=...)`.
- **Fan-out:** step 0 generates the hero **character reference sheet**;
  sibling panel `.step()` calls use `input_from=0` (feed the hero ref image
  for consistency) + `max_concurrency=4`.
- `.run(sink=storage, timeout=...)` → `(run, manifest)`.
- **Variant / iteration:** `.from_result(previous_run)` to regenerate a
  single panel as a variant carrying `parent_run_id` (the "panel variants
  persist on B2" requirement, with lineage).
- `S3StorageBackend.for_backblaze(bucket, key_id=, app_key=, region=, public_url_base=)`.
- `ObjectStorageSink(backend, key_strategy=KeyStrategy.HIERARCHICAL)`.
- `LoggingTracer` passed to `.run(tracer=...)` for visible step events.
- FastAPI handlers return `Run` / `Step` / `Asset` **directly** — no DTOs.

## 6. B2 surface

Effectively **none in sample source.** All bucket reads/writes happen inside
`genblaze-s3` via the sink. Storage is configured once in
`app/repo/storage.py` and handed to `.run(sink=...)`.

UA: delegated — satisfied by `genblaze-s3`'s `b2ai-genblaze/<version>` UA +
`Pipeline(name="comic-storyboard-b2")` provenance + SHA-256 Manifests.
**b2-doctor check #2 exception applies** (no S3 client in sample source).

> **Scope note — strip export:** the composed strip is a *derived* artifact.
> `strip.py` fetches each panel's **durable public B2 URL** (`httpx`, a read
> of a public URL — not boto3) and composes a PNG with Pillow, returned to
> the client as a download. It is **not** re-uploaded, because the storage
> backend exposes no *documented* arbitrary-file `put` (only pipeline-asset
> persistence via the sink). Re-persisting the strip is listed as a
> documented future extension; flagged as an open question for the builder
> to confirm against the installed wheel (and a candidate DX observation).

## 7. Ethos constraints (non-negotiable)

- `Pipeline(name="comic-storyboard-b2")` — the slug IS the provenance signal.
- **No `boto3` / `botocore` imports anywhere in sample source.**
  `tests/test_structure.py` asserts this (and that `genblaze_*` imports
  appear only under `app/repo/`).
- FastAPI handlers return Genblaze Pydantic models (`Run`, `Step`, `Asset`,
  `FileEntry`) directly — no mirrored DTOs. `schemas.py` holds only inbound
  request bodies.
- `.env.example` uses **`B2_APPLICATION_KEY`** (parent standard).
  `S3StorageBackend.for_backblaze(...)` is called with explicit `key_id=`
  and `app_key=` kwargs so the library's `B2_APP_KEY` / `B2_KEY_ID` env
  fallback never fires.
- Genblaze imports confined to `services/api/app/repo/`. (The Anthropic
  story-breaker call lives in `app/story_breaker.py`, outside `repo/`,
  because it is **not** a Genblaze call — see live-context note.)
- Size targets: `repo/pipelines.py` **< 100 lines**; total
  `services/api/app/` **≤ 400 lines**.

## 8. Key features (seed README + `docs/features/*`)

1. **LLM story breaker** — one sentence → a structured `PanelScript`
   (characters + per-panel prompts) via Claude with forced-schema tool use.
2. **Character reference sheets** generated once, persisted on B2, and
   reused as the consistency anchor for every panel.
3. **Character-consistent panel generation** — `consistent-character` /
   IP-Adapter via `genblaze-replicate`, fanned out concurrently
   (`input_from=0` + `max_concurrency`).
4. **Panel variants with lineage** — `.from_result()` regenerates a single
   panel as a child run (`parent_run_id`), persisted on B2.
5. **Export as image strip** — panels composed into one downloadable PNG
   from their durable B2 URLs.
6. **Provenance built in** — every generated asset carries a SHA-256
   manifest from Genblaze; no sample code involved.

## 9. Doc plan (all written from scratch)

- `README.md` — "cheap generative-media app" framing; quickstart (env, `uv`
  install, run API + web), feature list, the prompt→strip flow, screenshot
  placeholders, styling credit line for the starter-kit.
- `AGENTS.md` — map for coding agents: where genblaze imports live (`repo/`
  only), the boto3 ban + structure test, B2 standards, size targets, the
  "story breaker is the one non-Genblaze AI call" rule.
- `docs/ARCHITECTURE.md` — Next.js → FastAPI → Genblaze pipeline → B2; the
  prompt → script → ref sheet → fan-out panels → variants → strip data flow;
  why the LLM step sits outside the pipeline.
- `docs/app-workflows.md` — end-to-end walkthrough with the API call
  sequence and example payloads (Genblaze `Run`/`Step`/`Asset` shapes).
- `docs/features/story-breaker.md` — Claude schema-forced scripting; the
  Genblaze structured-text-step gap (and why `chat()` doesn't fill it).
- `docs/features/character-consistency.md` — ref sheet → `input_from` → panel.
- `docs/features/panel-fanout.md` — sibling steps, `input_from=0`, `max_concurrency`.
- `docs/features/strip-export.md` — Pillow compose from durable B2 URLs.

## 10. Reference snippets (anchor for `repo/` — paste & adapt)

**`app/repo/storage.py`** — backend + sink, explicit credential kwargs:
```python
from genblaze_core import ObjectStorageSink, KeyStrategy
from genblaze_s3 import S3StorageBackend

def make_sink(s) -> ObjectStorageSink:
    backend = S3StorageBackend.for_backblaze(
        s.b2_bucket_name,
        key_id=s.b2_application_key_id,   # explicit → library env fallback never fires
        app_key=s.b2_application_key,
        region=s.b2_region,
        public_url_base=s.b2_public_url_base,  # public bucket → durable URLs for strip compose
    )
    return ObjectStorageSink(backend, key_strategy=KeyStrategy.HIERARCHICAL)
```

**`app/repo/pipelines.py`** — name + fan-out (the whole generate surface):
```python
from genblaze_core import Pipeline, Modality, LoggingTracer
from genblaze_replicate import ReplicateProvider

def build_comic(script, sink):
    pipe = Pipeline(name="comic-storyboard-b2").step(   # step 0: hero reference sheet
        ReplicateProvider(), model="black-forest-labs/flux-schnell",
        prompt=script.hero.reference_prompt, modality=Modality.IMAGE, aspect_ratio="1:1",
    )
    for panel in script.panels:                          # steps 1..N: consistent panels
        pipe = pipe.step(
            ReplicateProvider(), model="fofr/consistent-character",
            prompt=panel.prompt, modality=Modality.IMAGE,
            input_from=0, max_concurrency=4, aspect_ratio="3:2",  # feed hero ref image
        )
    return pipe.run(sink=sink, tracer=LoggingTracer(), timeout=600)
```

**`app/repo/pipelines.py`** — variant with parent lineage:
```python
def regenerate_panel(prev_run, panel_prompt, sink):
    return (Pipeline(name="comic-storyboard-b2")
            .from_result(prev_run)                       # carries parent_run_id
            .step(ReplicateProvider(), model="fofr/consistent-character",
                  prompt=panel_prompt, modality=Modality.IMAGE, input_from=0, aspect_ratio="3:2")
            .run(sink=sink, timeout=300))
```

**`app/story_breaker.py`** — the one non-Genblaze AI call (Claude, schema-forced):
```python
import anthropic
def break_story(prompt: str) -> dict:
    client = anthropic.Anthropic()
    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=2048,
        tools=[{"name": "panel_script", "input_schema": PANEL_SCRIPT_SCHEMA}],
        tool_choice={"type": "tool", "name": "panel_script"},
        messages=[{"role": "user", "content": STORY_BREAKER_PROMPT.format(idea=prompt)}],
    )
    return next(b.input for b in msg.content if b.type == "tool_use")
```

**Smoke-test import** (run after `uv pip install`, before any app code):
```bash
python -c "from genblaze_core import Pipeline, Modality, ObjectStorageSink, KeyStrategy; \
from genblaze_s3 import S3StorageBackend; from genblaze_replicate import ReplicateProvider; print('ok')"
```

### Open questions for the builder to resolve against the installed wheels
1. **`input_from` → reference-image mapping:** confirm how `ReplicateProvider`
   forwards the upstream asset to a model's reference-image input (e.g.
   `fofr/consistent-character`'s `subject`, or IP-Adapter's `image`). If it
   needs a named kwarg rather than auto-wiring, set it explicitly.
2. **`.run(tracer=...)`** keyword — confirm the tracer param name and that
   `LoggingTracer` is importable from `genblaze_core`.
3. **`from_result` + `step` ordering** — confirm `.from_result()` is chainable
   before `.step()` as shown.
4. **`chat()` callable** — re-confirm the new standalone `chat()` can't emit
   schema-forced structured output; if it can, note it (the story breaker
   could then collapse onto Genblaze). Keep the Anthropic call regardless
   unless the wheel proves otherwise.
5. If the resolved `genblaze-core` is **> 0.3.2** at build time, note the
   delta and re-verify the snippets against the newer surface.
