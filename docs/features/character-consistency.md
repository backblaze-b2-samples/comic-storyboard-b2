# Feature: character consistency

Characters stay visually consistent across panels by generating a single **hero
reference sheet** first and feeding it into every panel.

## The shape

In `repo/pipelines.build_comic()`:

- **Step 0** generates the hero reference sheet with `black-forest-labs/flux-schnell`
  from `script["hero"]["reference_prompt"]`. This is a cheap, fast model — it's
  run once and reused.
- **Steps 1..N** generate panels with `fofr/consistent-character`, each passing
  `input_from=0`. The pipeline resolves `input_from=0` to step 0's output
  assets and forwards them as the model's reference image.

## How the reference image is wired

The `genblaze-replicate` provider maps chained inputs to a model's common
`image` / `video` / `audio` input key via its `route_by_media_type` fallback
spec (the catalog isn't enumerated; every slug resolves through this fallback).
So `input_from=0` auto-wires the hero sheet into the panel model's `image`
input with no extra kwargs in sample code.

> If you swap to a model whose reference input is named differently (e.g.
> IP-Adapter variants that key on `subject` or `ip_adapter_image`), pass that
> name explicitly as a step kwarg — it flows through `**params` to the provider
> payload. With `fofr/consistent-character` the common `image` mapping is what
> the sample relies on; verify against the model's current Replicate schema.

## Variants reuse the same sheet

When a panel is re-rolled (see [`panel-fanout.md`](panel-fanout.md) and the
variant flow in [`../app-workflows.md`](../app-workflows.md)), the original
hero sheet is fed back in via `external_inputs` so the variant stays on-model.
