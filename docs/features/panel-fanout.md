# Feature: panel fan-out

All panels are generated as sibling steps that share the hero reference sheet,
and they run concurrently.

## The construction

```python
pipe = Pipeline(
    name="comic-storyboard-b2",
    max_concurrency=4,          # cap on parallel panel generation
    tracer=LoggingTracer(),     # surfaces step.started / step.completed events
).step(provider, model=REF_SHEET_MODEL, prompt=hero_prompt, modality=Modality.IMAGE)

for panel in script["panels"]:
    pipe = pipe.step(
        provider,
        model=PANEL_MODEL,
        prompt=panel["prompt"],
        modality=Modality.IMAGE,
        input_from=0,           # every panel reads step 0's hero sheet
        aspect_ratio="3:2",
    )

run, manifest = pipe.run(sink=sink, timeout=600, raise_on_failure=True)
```

## Notes verified against genblaze-core 0.3.2

- **`max_concurrency` and `tracer` are `Pipeline(...)` constructor kwargs**, not
  `.step()` / `.run()` kwargs. (The plan's draft snippet placed them on `.step()`
  / `.run()`; the installed wheel rejects that — `max_concurrency` would be
  forwarded to the provider as a payload param, and `.run()` has no `tracer`.)
- **`input_from` is 0-indexed across prior steps in the same run.** Index 0 is
  step 0 (the hero sheet). It cannot reach across runs — that's why variants use
  `external_inputs` instead (see [`character-consistency.md`](character-consistency.md)).
- **`input_from` accepts an int or a list of ints**; panels here use a single
  source (`0`).
- **`.run()` returns a `PipelineResult`** that unpacks as `run, manifest = ...`.
- **`raise_on_failure=True`** is passed explicitly — it's the genblaze-core
  0.4.0 default, so opting in now keeps the sample forward-compatible and lets
  the route map a failed step to HTTP 502.
