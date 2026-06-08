# Architecture

`comic-storyboard-b2` is a thin two-tier app — a Next.js frontend and a FastAPI
backend — wrapped around a single Genblaze pipeline. The interesting part is how
little glue code there is: storage, content-addressing, provenance, fan-out, and
variant lineage are all carried by the library.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│ apps/web  (Next.js 16, React 19, Tailwind v4, shadcn/ui)      │
│   page.tsx → story-form, storyboard-grid, panel-card          │
│   lib/api.ts → typed fetch wrapper to the FastAPI backend     │
└───────────────────────────┬─────────────────────────────────┘
                            │ JSON over HTTP
┌───────────────────────────▼─────────────────────────────────┐
│ services/api  (FastAPI)                                       │
│                                                               │
│   main.py        routes; returns Genblaze Run/Manifest        │
│   story_breaker  Anthropic Claude → PanelScript  (pre-pipeline)│
│   strip.py       Pillow compose from B2 URLs     (post-pipeline)│
│                                                               │
│   repo/  ← the ONLY place genblaze_* is imported              │
│     storage.py   S3StorageBackend.for_backblaze → sink        │
│     pipelines.py Pipeline.step(...).run(sink=...)             │
└───────────────────────────┬─────────────────────────────────┘
                            │ genblaze-s3 (owns the S3 client + UA)
┌───────────────────────────▼─────────────────────────────────┐
│ Backblaze B2  — generated assets + SHA-256 manifests          │
└─────────────────────────────────────────────────────────────┘
```

## Data flow

1. **Idea → script.** The frontend POSTs a one-sentence idea to `/storyboards`.
   `story_breaker.break_story()` calls Claude with forced tool use and returns a
   `PanelScript`: a hero (name + reference-sheet prompt) and N panel prompts.
2. **Script → reference sheet.** `pipelines.build_comic()` constructs a
   `Pipeline(name="comic-storyboard-b2")`. Step 0 generates the hero reference
   sheet with FLUX-schnell.
3. **Reference sheet → panels (fan-out).** Steps 1..N use
   `fofr/consistent-character` with `input_from=0`, so each panel is generated
   against the hero sheet for visual consistency. `max_concurrency` on the
   pipeline caps how many panels run in parallel.
4. **Run → B2.** `.run(sink=...)` uploads every asset to B2 through the
   `ObjectStorageSink` and returns `(Run, Manifest)`. The manifest carries the
   canonical SHA-256 hash and the pipeline name as provenance.
5. **Variant.** `/storyboards/variants` calls `regenerate_panel()`, which builds
   a new single-step pipeline, links it to the prior run via `from_result()`
   (carrying `parent_run_id`), and feeds the original hero sheet back in via
   `external_inputs` for consistency.
6. **Strip export.** `/strip` fetches each panel's durable **public B2 URL**
   (plain HTTPS GET via httpx — not boto3) and tiles them into one PNG with
   Pillow, returned as a download.

## Why the LLM step sits outside the pipeline

Genblaze 0.3.x providers wrap *media* generation models. There is no
structured-text / forced-schema step, and the installed 0.3.2 wheel exposes no
`chat()` callable. So the story breaker — which must emit a strict JSON schema —
is a direct Anthropic call that runs *before* the pipeline and produces the
data that drives the `.step()` calls. It is deliberately kept in
`app/story_breaker.py`, **outside** `repo/`, because it is not a Genblaze call.
See [`features/story-breaker.md`](features/story-breaker.md).

## Provenance & storage delegation

The sample never touches boto3. `genblaze-s3`'s `S3StorageBackend.for_backblaze`
owns the S3 client and sets a `b2ai-genblaze/<version>` user agent on it. The
app's identity is carried two ways: the `Pipeline(name=...)` slug and the
SHA-256 manifest written next to every asset in B2. This is why the
`/b2-doctor` custom-user-agent check is satisfied by delegation rather than a
per-app `customUserAgent` string.
