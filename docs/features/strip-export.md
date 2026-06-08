# Feature: export as image strip

Composes the generated panels into a single downloadable PNG.

## How it works

`POST /strip` takes the panel URLs (the durable **public B2 URLs** already
returned in the run's assets) and `app/strip.py`:

1. Fetches each panel over plain HTTPS with `httpx` — **not** boto3. These are
   public-bucket URLs, so no signing or S3 client is involved.
2. Tiles them into a 2-column grid with Pillow.
3. Returns `image/png` with a `Content-Disposition: attachment` header.

## Why the strip is not re-uploaded to B2

The composed strip is a **derived** artifact. The installed `genblaze-s3`
backend exposes no documented arbitrary-file `put` — its surface is
pipeline-asset persistence via the `ObjectStorageSink`, not a general object
store API. Rather than reach around the library (e.g. by constructing our own
boto3 client, which the structure test forbids), the sample returns the strip
straight to the browser.

## Future extension

Re-persisting the strip on B2 with its own manifest is a natural next step. Two
clean paths, depending on what Genblaze exposes:

- A documented backend `put(key, bytes, content_type)` on `S3StorageBackend`
  (the most direct fit), or
- A composition/transform step inside the pipeline (Genblaze ships an
  `FFmpegCompositor` for video; an image-tiling compositor would let the strip
  be a real pipeline step, persisted by the same sink with provenance intact).

Both are captured as Genblaze DX observations in the build's SDK feedback.
