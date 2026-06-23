# comic-storyboard-b2

![Generate view](docs/images/screenshot-generate.png)
![Panels view](docs/images/screenshot-panels.png)

Describe a story in a sentence or two and get back a multi-panel comic /
storyboard whose characters and settings stay consistent across panels — every
generated frame persisted durably to **Backblaze B2** with a SHA-256 provenance
manifest.

This is a **cheap generative-media sample** for developers evaluating
[Genblaze](https://pypi.org/project/genblaze-core/). The point is ergonomics:
the entire generate-and-persist surface is a single
`Pipeline(...).step(...).run(sink=...)` chain. B2 storage, content-addressing,
SHA-256 manifests, fan-out concurrency, and variant lineage all come from the
library — not from sample code.

Storage is delegated end to end: this sample contains **zero** direct S3/boto3
calls. Everything lands in B2 through `genblaze-s3`'s `ObjectStorageSink`, which
owns the only S3 client (and sets its own `b2ai-genblaze/<version>` user agent).
Per-app identity is carried in `Pipeline(name="comic-storyboard-b2")` and written
into every manifest.

> New to Backblaze B2 Cloud Storage? Start here: <https://blze.ai/storage>

## What it does

1. **LLM story breaker** — one sentence → a structured `PanelScript`
   (a hero character + per-panel prompts) via Claude with forced-schema tool use.
2. **Character reference sheet** — generated once (FLUX-schnell), persisted on
   B2, and reused as the consistency anchor for every panel.
3. **Character-consistent panels** — `fofr/consistent-character` via
   `genblaze-replicate`, fanned out concurrently with `input_from=0` +
   `max_concurrency`.
4. **Panel variants with lineage** — `from_result()` regenerates a single panel
   as a child run carrying `parent_run_id`, persisted on B2.
5. **Export as image strip** — panels composed into one downloadable PNG,
   fetched from their durable public B2 URLs.
6. **Provenance built in** — every asset carries a SHA-256 manifest from
   Genblaze; no sample code involved.

## Architecture at a glance

```
Next.js (apps/web)  ──HTTP──▶  FastAPI (services/api)
                                  │
                                  ├─ story_breaker.py   Claude → PanelScript   (one non-Genblaze AI call)
                                  ├─ repo/pipelines.py  Pipeline.step().run()  (ALL genblaze_* lives here)
                                  └─ repo/storage.py    S3StorageBackend.for_backblaze → ObjectStorageSink
                                                                │
                                                                ▼
                                                         Backblaze B2 (assets + manifests)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full data flow and
[`docs/app-workflows.md`](docs/app-workflows.md) for the API call sequence.

## Quickstart

### 1. Configure

```bash
cp .env.example .env
# fill in B2_*, REPLICATE_API_TOKEN, ANTHROPIC_API_KEY
```

The B2 application key needs `readFiles` + `writeFiles` on the target bucket.
The bucket must be **public** so the strip exporter can fetch durable panel URLs.

### 2. Backend (FastAPI + Genblaze)

```bash
cd services/api
uv venv --python 3.11
uv pip install -r requirements.txt        # installs genblaze-* from PyPI
uv run uvicorn app.main:app --reload      # http://localhost:8000
```

### 3. Frontend (Next.js)

```bash
cd apps/web
npm install
npm run dev                               # http://localhost:3000
```

Open <http://localhost:3000>, type a story idea, pick a panel count, and
generate. Re-roll any panel for a lineage-tracked variant, then export the strip.

## The prompt → strip flow

```
idea ──▶ break_story()        Claude, forced-schema tool use → PanelScript
     ──▶ build_comic()        step 0: hero ref sheet; steps 1..N: panels (input_from=0, fan-out)
     ──▶ .run(sink=...)       assets + SHA-256 manifest persisted to B2, returns (Run, Manifest)
     ──▶ regenerate_panel()   from_result() → child run with parent_run_id (variant)
     ──▶ compose_strip()      Pillow tiles the durable B2 URLs into one PNG download
```

## Tech

- **Backend:** FastAPI, `genblaze-core`, `genblaze-s3`, `genblaze-replicate`,
  `anthropic`, Pillow. Python 3.11+.
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui.

## Credits

The visual design system (Tailwind theme tokens and shadcn primitives under
`apps/web/src/components/ui/`) is imported from the internal
**vibe-coding-starter-kit**; only style tokens and UI primitives were copied —
no pages, routes, or business logic.
