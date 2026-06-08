# AGENTS.md — map for coding agents

This sample exists to exercise the published `genblaze-*` wheels end to end.
Keep these invariants intact; they are enforced by tests and the `/b2-doctor`
audit.

## Where things live

```
services/api/app/
  main.py          FastAPI routes — return Genblaze Run/Manifest directly, no DTOs
  config.py        pydantic-settings: B2_*, REPLICATE_API_TOKEN, ANTHROPIC_API_KEY
  schemas.py       INBOUND request bodies ONLY (StoryRequest, VariantRequest, StripRequest)
  story_breaker.py the ONE non-Genblaze AI call (Anthropic Claude, schema-forced)
  strip.py         the ONE non-Genblaze media op (Pillow compose from B2 URLs)
  repo/            ← ALL genblaze_* imports are confined here
    storage.py     S3StorageBackend.for_backblaze + ObjectStorageSink
    pipelines.py   Pipeline construction (the whole generate surface)
apps/web/          Next.js 16 / React 19 / Tailwind v4 frontend
```

## Hard rules (enforced by `tests/test_structure.py`)

1. **No `boto3` / `botocore` imports anywhere in `services/api/app/`.** Storage
   is delegated to `genblaze-s3`, which owns the only S3 client and sets its own
   `b2ai-genblaze/<version>` user agent. The test greps for these imports.
2. **`genblaze_*` is imported only under `app/repo/`.** Routes, story breaker,
   strip, config, and schemas are Genblaze-agnostic. The test enforces this.
3. **Handlers return Genblaze Pydantic models** (`Run`, `Manifest`, `Step`,
   `Asset`) directly. `schemas.py` holds only inbound request bodies — never
   mirror a Genblaze model.

## The story-breaker exception

Genblaze 0.3.x has no structured-text / forced-schema generation step (the
providers wrap *media* models; there is no `chat()` callable in the installed
0.3.2 wheel — re-verified at build time). So the LLM story breaker is a direct
Anthropic call in `story_breaker.py`, run *before* the pipeline, and it lives
**outside** `repo/` precisely because it is not a Genblaze call. If a future
Genblaze release adds schema-forced output, collapse it into a pipeline step and
move it under `repo/`.

## B2 standards

- S3-compatible API only (delegated via `genblaze-s3`); never the b2-native API.
- Standardized env names: `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`,
  `B2_BUCKET_NAME`, `B2_REGION`, `B2_ENDPOINT` (+ `B2_PUBLIC_URL_BASE`).
  Credentials are passed as explicit `key_id=` / `app_key=` kwargs so the
  genblaze-s3 `B2_APP_KEY` env fallback never fires. Never use `B2_APP_KEY`.
- Custom user agent: **delegated** to `genblaze-s3`; app identity rides in
  `Pipeline(name="comic-storyboard-b2")` and every manifest.

## Size targets

- `repo/pipelines.py`: aim for ~100 lines of code (currently the logic is ~30
  statements; docstrings explaining the verified API shape push the file a bit
  over the physical-line target — keep them, they document non-obvious behavior).
- `services/api/app/` total: ~400 lines.

## Run the guardrail tests

```bash
cd services/api && uv run pytest -q
```
