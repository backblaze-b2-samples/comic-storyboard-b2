# App workflows

End-to-end walkthrough of the three API workflows, with example payloads. All
response bodies are Genblaze models serialized directly by FastAPI (no DTOs).

## 1. Generate a storyboard

`POST /storyboards`

Request:

```json
{ "idea": "A lonely lighthouse keeper befriends a storm-petrel.", "panel_count": 4 }
```

Server steps:

1. `break_story(idea, panel_count)` → Claude returns a `PanelScript`:
   ```json
   {
     "hero": { "name": "Maren", "reference_prompt": "weathered lighthouse keeper, ..." },
     "panels": [
       { "prompt": "Maren climbs the spiral stairs at dawn", "caption": "Another shift begins." },
       { "prompt": "A storm-petrel shelters on the gallery rail", "caption": "..." }
     ]
   }
   ```
2. `build_comic(script, sink)` runs a pipeline: step 0 = hero reference sheet,
   steps 1..N = panels with `input_from=0`.
3. Assets + manifest are persisted to B2; the route returns `(Run, Manifest)`.

Response (abridged Genblaze shapes):

```json
{
  "run": {
    "run_id": "3341433e-…",
    "status": "completed",
    "parent_run_id": null,
    "steps": [
      { "step_id": "…", "provider": "replicate", "model": "black-forest-labs/flux-schnell",
        "status": "succeeded", "assets": [{ "url": "https://<bucket>.s3.<region>.backblazeb2.com/…", "modality": "image", "sha256": "…" }] },
      { "step_id": "…", "provider": "replicate", "model": "fofr/consistent-character",
        "status": "succeeded", "assets": [{ "url": "https://…", "modality": "image", "sha256": "…" }] }
    ]
  },
  "manifest": { "canonical_hash": "fae7170cd1df…" }
}
```

Step 0 is the hero reference sheet; steps 1..N are the comic panels.

## 2. Regenerate a single panel (variant with lineage)

`POST /storyboards/variants`

```json
{ "parent_run_id": "3341433e-…", "panel_prompt": "Maren laughs as the petrel steals a biscuit" }
```

The server links a new single-step pipeline to the parent via `from_result()`
(so the new run carries `parent_run_id`) and feeds the parent's hero reference
sheet in via `external_inputs` for consistency. The response is the same
`(Run, Manifest)` shape, with `run.parent_run_id` set.

## 3. Export the strip

`POST /strip`

```json
{ "panel_urls": ["https://<bucket>.s3.<region>.backblazeb2.com/…panel0.png", "https://…panel1.png"] }
```

Returns `image/png` (a 2-column tiled composite) as a download. The server
fetches each URL over plain HTTPS (httpx) — these are the durable public B2 URLs
already returned in the run's assets — and composes with Pillow. The strip is
not re-uploaded (see [`features/strip-export.md`](features/strip-export.md)).

## Health

`GET /health` → `{ "status": "ok" }`
