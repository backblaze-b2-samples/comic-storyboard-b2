"""Issue-template guardrails for the scheduled implementation workflow."""

from __future__ import annotations

from pathlib import Path

import yaml

ROOT_DIR = Path(__file__).resolve().parents[3]
TASK_TEMPLATE = ROOT_DIR / ".github" / "ISSUE_TEMPLATE" / "task.yml"
READY_LABEL = "codex-ready"


def test_task_template_does_not_grant_workflow_eligibility() -> None:
    """Issues created from the public form must still need maintainer review."""
    text = TASK_TEMPLATE.read_text(encoding="utf-8")
    template = yaml.safe_load(text)
    assert isinstance(template, dict)

    auto_labels = template.get("labels") or []
    assert isinstance(auto_labels, list)

    assert READY_LABEL not in auto_labels

    intro = template["body"][0]["attributes"]["value"]
    assert isinstance(intro, str)
    intro_text = " ".join(intro.lower().split())
    assert "maintainer must review" in intro_text
    assert READY_LABEL in intro
