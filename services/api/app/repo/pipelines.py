"""The whole generate-and-persist surface — one Pipeline chain.

Provenance: ``Pipeline(name="comic-storyboard-b2")`` is the slug written into
every Manifest in B2. Verified against genblaze-core 0.3.2: ``tracer`` and
``max_concurrency`` are ``Pipeline(...)`` constructor kwargs (not ``.run()`` /
``.step()`` kwargs); ``input_from=0`` auto-wires the upstream image into the
model's common ``image`` input; ``.run(sink=...)`` returns a ``PipelineResult``
that unpacks as ``run, manifest = pipe.run(...)``.
"""

from __future__ import annotations

from genblaze_core import LoggingTracer, Manifest, Modality, Pipeline, PipelineResult, Run
from genblaze_core.storage.sink import ObjectStorageSink
from genblaze_replicate import ReplicateProvider

# from_result() needs the whole PipelineResult (not just the Run), so the repo
# layer registers each by run_id; routes only pass run_id strings across the
# boundary. A real deployment would persist this — manifests already live in B2.
_RESULTS: dict[str, PipelineResult] = {}


def get_result(run_id: str) -> PipelineResult | None:
    return _RESULTS.get(run_id)


REF_SHEET_MODEL = "black-forest-labs/flux-schnell"
PANEL_MODEL = "fofr/consistent-character"

PANEL_CONCURRENCY = 4
RUN_TIMEOUT_SEC = 600.0
VARIANT_TIMEOUT_SEC = 300.0


def _provider(api_token: str) -> ReplicateProvider:
    return ReplicateProvider(api_token=api_token)


def build_comic(
    script: dict,
    sink: ObjectStorageSink,
    *,
    replicate_token: str,
) -> tuple[Run, Manifest]:
    """Hero reference sheet (step 0) + N character-consistent panels (fan-out).

    ``script`` is the PanelScript dict from the story breaker:
    ``{"hero": {"reference_prompt": str}, "panels": [{"prompt": str}, ...]}``.
    """
    provider = _provider(replicate_token)
    pipe = Pipeline(  # max_concurrency caps fan-out; tracer surfaces step events
        name="comic-storyboard-b2",
        max_concurrency=PANEL_CONCURRENCY,
        tracer=LoggingTracer(),
    ).step(
        provider,
        model=REF_SHEET_MODEL,
        prompt=script["hero"]["reference_prompt"],
        modality=Modality.IMAGE,
        aspect_ratio="1:1",
    )
    for panel in script["panels"]:
        pipe = pipe.step(
            provider,
            model=PANEL_MODEL,
            prompt=panel["prompt"],
            modality=Modality.IMAGE,
            input_from=0,  # feed the hero reference sheet (step 0) for consistency
            aspect_ratio="3:2",
        )
    # raise_on_failure=True surfaces a failed step as PipelineError (route -> 502);
    # also the genblaze-core 0.4.0 default, so we opt in now for forward-compat.
    result = pipe.run(sink=sink, timeout=RUN_TIMEOUT_SEC, raise_on_failure=True)
    _RESULTS[result.run.run_id] = result
    return result.run, result.manifest


def regenerate_panel(
    parent_run_id: str,
    panel_prompt: str,
    sink: ObjectStorageSink,
    *,
    replicate_token: str,
) -> tuple[Run, Manifest]:
    """Re-roll a single panel as a child run carrying ``parent_run_id`` lineage.

    The variant is a brand-new single-step pipeline, so the hero sheet is not
    addressable via ``input_from`` (no prior steps in *this* run). We pull the
    hero Asset from the parent's step 0 and feed it via ``external_inputs``,
    while ``from_result()`` carries the lineage. (See SDK feedback: an
    ``input_from`` that could reach across ``from_result`` would be cleaner.)
    """
    prev = _RESULTS.get(parent_run_id)
    if prev is None:
        raise KeyError(parent_run_id)
    hero_assets = list(prev.run.steps[0].assets)  # step 0 == hero reference sheet
    provider = _provider(replicate_token)
    result = (
        Pipeline(name="comic-storyboard-b2")
        .from_result(prev)  # carries parent_run_id onto the new run
        .step(
            provider,
            model=PANEL_MODEL,
            prompt=panel_prompt,
            modality=Modality.IMAGE,
            external_inputs=hero_assets,  # feed parent's hero sheet for consistency
            aspect_ratio="3:2",
        )
        .run(sink=sink, timeout=VARIANT_TIMEOUT_SEC, raise_on_failure=True)
    )
    _RESULTS[result.run.run_id] = result
    return result.run, result.manifest
