"""Project brief defaults and validation for the knowledge layer."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


DEFAULT_EFFECTIVE = {
    "creative_mode": "visual_explain",
    "knowledge_depth": "balanced",
    "aspect_ratio": "9:16",
    "target_duration_ms": 165_000,
}

_MODE_RESOLUTION = {
    "auto": "visual_explain",
    "creative": "creative",
    "visual_explain": "visual_explain",
    "knowledge_dense": "knowledge_dense",
    "story": "story",
    "custom": "custom",
}
_DEPTH_RESOLUTION = {
    "auto": "balanced",
    "intro": "intro",
    "balanced": "balanced",
    "advanced": "advanced",
}


class BriefValidationError(ValueError):
    """Raised when a ProjectState.brief is invalid or changes a user choice."""


def _project_schema() -> dict[str, Any]:
    root = Path(__file__).resolve().parents[3]
    with (root / "contracts" / "schemas" / "project-state.schema.json").open(
        encoding="utf-8"
    ) as handle:
        return json.load(handle)


def build_brief(
    user_input: dict[str, Any],
    *,
    effective: dict[str, Any] | None = None,
    revision: int = 1,
) -> dict[str, Any]:
    """Build the canonical brief while retaining all explicitly supplied values."""
    if not isinstance(user_input, dict):
        raise BriefValidationError("brief.user_input must be an object")
    user_values = deepcopy(user_input)
    resolved = deepcopy(DEFAULT_EFFECTIVE)
    resolved["creative_mode"] = _MODE_RESOLUTION.get(
        user_values.get("creative_mode", "auto"), DEFAULT_EFFECTIVE["creative_mode"]
    )
    resolved["knowledge_depth"] = _DEPTH_RESOLUTION.get(
        user_values.get("knowledge_depth", "auto"), DEFAULT_EFFECTIVE["knowledge_depth"]
    )
    for field in ("aspect_ratio", "art_style", "creative_mode_notes"):
        if field in user_values:
            resolved[field] = user_values[field]

    if effective is not None:
        for field, value in effective.items():
            if field in resolved and field in user_values:
                user_value = user_values[field]
                expected = _MODE_RESOLUTION.get(user_value, user_value)
                if field == "knowledge_depth":
                    expected = _DEPTH_RESOLUTION.get(user_value, user_value)
                if value != expected:
                    raise BriefValidationError(
                        f"brief.effective.{field} cannot override the explicit "
                        f"brief.user_input value {user_value!r}"
                    )
            resolved[field] = value

    brief = {"revision": revision, "user_input": user_values, "effective": resolved}
    validate_brief(brief)
    return brief


def validate_brief(brief: dict[str, Any]) -> None:
    """Validate a brief against the brief definition in the public ProjectState schema."""
    if not isinstance(brief, dict):
        raise BriefValidationError("brief must be an object")
    brief_schema = _project_schema()["properties"]["brief"]
    errors = sorted(
        Draft202012Validator(brief_schema).iter_errors(brief),
        key=lambda error: list(error.absolute_path),
    )
    if errors:
        details = "; ".join(
            f"{'.'.join(map(str, error.absolute_path)) or 'brief'}: {error.message}"
            for error in errors
        )
        raise BriefValidationError(details)

    supplied = brief["user_input"]
    effective = brief["effective"]
    for field, resolver in (
        ("creative_mode", _MODE_RESOLUTION),
        ("knowledge_depth", _DEPTH_RESOLUTION),
    ):
        requested = supplied.get(field)
        if requested and requested != "auto" and effective[field] != resolver[requested]:
            raise BriefValidationError(
                f"brief.effective.{field} does not preserve the explicit user choice"
            )
    for field in ("aspect_ratio", "art_style", "creative_mode_notes"):
        if field in supplied and effective.get(field) != supplied[field]:
            raise BriefValidationError(
                f"brief.effective.{field} does not preserve the explicit user choice"
            )
