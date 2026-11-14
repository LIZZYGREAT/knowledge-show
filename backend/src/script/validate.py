"""Schema and cross-stage validation for ProductionScript artifacts."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from knowledge.package import validate_knowledge_package


class ScriptValidationError(ValueError):
    """A generated script does not satisfy the public contract or its references."""


def _repository_root() -> Path:
    return Path(__file__).resolve().parents[3]


@lru_cache(maxsize=None)
def _schema(name: str) -> dict[str, Any]:
    path = _repository_root() / "contracts" / "schemas" / f"{name}.schema.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _validate_schema(name: str, value: dict[str, Any]) -> None:
    errors = sorted(
        Draft202012Validator(_schema(name)).iter_errors(value),
        key=lambda error: list(error.absolute_path),
    )
    if errors:
        details = "; ".join(
            f"{'.'.join(map(str, error.absolute_path)) or name}: {error.message}"
            for error in errors[:8]
        )
        raise ScriptValidationError(f"{name} schema validation failed: {details}")


def selected_direction(
    project_state: dict[str, Any], knowledge_package: dict[str, Any]
) -> dict[str, Any]:
    """Return the direction already recorded by the coordinator."""
    decision = project_state.get("decisions", {})
    direction_id = decision.get("direction_id")
    if not direction_id:
        raise ScriptValidationError(
            "ProjectState.decisions.direction_id must be set before script generation"
        )
    direction = next(
        (item for item in knowledge_package["directions"] if item["id"] == direction_id),
        None,
    )
    if direction is None:
        raise ScriptValidationError(
            f"selected direction {direction_id!r} does not exist in KnowledgePackage"
        )
    return direction


def usable_knowledge_refs(
    knowledge_package: dict[str, Any], direction: dict[str, Any]
) -> set[str]:
    units = {unit["id"]: unit for unit in knowledge_package["knowledge_units"]}
    available = set(direction["knowledge_refs"])
    pending = list(available)
    while pending:
        ref = pending.pop()
        unit = units.get(ref)
        if unit is None:
            raise ScriptValidationError(
                f"direction {direction['id']} references missing knowledge unit {ref}"
            )
        if unit["verification_status"] != "verified":
            raise ScriptValidationError(
                f"direction {direction['id']} includes unverified knowledge unit {ref}"
            )
        for dependency in unit.get("depends_on", []):
            if dependency not in available:
                available.add(dependency)
                pending.append(dependency)
    for ref in knowledge_package["constraints"]["required_knowledge_refs"]:
        if ref not in available:
            raise ScriptValidationError(
                f"global required knowledge unit {ref} is not available to direction {direction['id']}"
            )
        if units[ref]["verification_status"] != "verified":
            raise ScriptValidationError(
                f"global required knowledge unit {ref} is not verified"
            )
    return available


def validate_script_inputs(
    project_state: dict[str, Any], knowledge_package: dict[str, Any]
) -> tuple[dict[str, Any], set[str]]:
    """Reject stale or unusable source data before spending a model call."""
    if not isinstance(project_state, dict) or not isinstance(knowledge_package, dict):
        raise ScriptValidationError("ProjectState and KnowledgePackage must be objects")
    _validate_schema("project-state", project_state)
    validate_knowledge_package(knowledge_package)
    project_id = project_state["project_id"]
    brief_revision = project_state["brief"]["revision"]
    expected_ref = {
        "artifact_id": knowledge_package["artifact_id"],
        "revision": knowledge_package["revision"],
    }
    if project_state["artifacts"].get("knowledge_package") != expected_ref:
        raise ScriptValidationError(
            "ProjectState.artifacts.knowledge_package must identify the exact supplied version"
        )
    if knowledge_package["project_id"] != project_id:
        raise ScriptValidationError("KnowledgePackage.project_id does not match ProjectState")
    if knowledge_package["brief_revision"] != brief_revision:
        raise ScriptValidationError("KnowledgePackage.brief_revision is stale")
    direction = selected_direction(project_state, knowledge_package)
    return direction, usable_knowledge_refs(knowledge_package, direction)


def validate_production_script(
    script: dict[str, Any],
    project_state: dict[str, Any],
    knowledge_package: dict[str, Any],
) -> None:
    """Validate shape, source versions, direction, trusted references, and timing."""
    if not isinstance(script, dict):
        raise ScriptValidationError("ProductionScript must be an object")

    direction, allowed_refs = validate_script_inputs(project_state, knowledge_package)
    _validate_schema("production-script", script)

    project_id = project_state["project_id"]
    brief_revision = project_state["brief"]["revision"]
    expected_ref = {
        "artifact_id": knowledge_package["artifact_id"],
        "revision": knowledge_package["revision"],
    }
    if script["project_id"] != project_id:
        raise ScriptValidationError("ProductionScript.project_id does not match ProjectState")
    if script["brief_revision"] != brief_revision:
        raise ScriptValidationError("ProductionScript.brief_revision is stale")
    if script["knowledge_package_ref"] != expected_ref:
        raise ScriptValidationError(
            "ProductionScript.knowledge_package_ref does not match the published KnowledgePackage"
        )

    if script["direction_id"] != direction["id"]:
        raise ScriptValidationError(
            "ProductionScript.direction_id does not match the ProjectState decision"
        )
    units = {unit["id"]: unit for unit in knowledge_package["knowledge_units"]}

    target_duration = project_state["brief"]["effective"]["target_duration_ms"]
    total_duration = script["total_duration_ms"]
    if abs(total_duration - target_duration) > target_duration * 0.10:
        raise ScriptValidationError(
            "ProductionScript.total_duration_ms must be within 10% of the brief target"
        )

    expected_start = 0
    seen_scene_ids: set[str] = set()
    seen_event_ids: set[str] = set()
    seen_text_ids: set[str] = set()
    used_refs: set[str] = set()
    for scene in script["scenes"]:
        scene_id = scene["scene_id"]
        if scene_id in seen_scene_ids:
            raise ScriptValidationError(f"duplicate scene_id {scene_id}")
        seen_scene_ids.add(scene_id)
        if scene["start_ms"] != expected_start:
            raise ScriptValidationError(
                f"scene {scene_id} must start at {expected_start}ms to keep the timeline continuous"
            )
        scene_end = scene["start_ms"] + scene["duration_ms"]
        if scene_end > total_duration:
            raise ScriptValidationError(f"scene {scene_id} extends past the script duration")
        expected_start = scene_end

        scene_refs = set(scene["knowledge_refs"])
        _check_refs(scene_refs, allowed_refs, units, f"scene {scene_id}")
        used_refs.update(scene_refs)

        for event in scene["events"]:
            event_id = event["id"]
            if event_id in seen_event_ids:
                raise ScriptValidationError(f"duplicate event id {event_id}")
            seen_event_ids.add(event_id)
            offset = event["offset_ms"]
            duration = event.get("duration_ms")
            if offset >= scene["duration_ms"]:
                raise ScriptValidationError(
                    f"event {event_id} must begin inside scene {scene_id}"
                )
            if duration is not None and offset + duration > scene["duration_ms"]:
                raise ScriptValidationError(
                    f"event {event_id} extends past scene {scene_id}"
                )
            event_refs = set(event.get("knowledge_refs", []))
            if not event_refs.issubset(scene_refs):
                raise ScriptValidationError(
                    f"event {event_id} knowledge_refs must be a subset of scene {scene_id}"
                )
            _check_refs(event_refs, allowed_refs, units, f"event {event_id}")

        subtitle_ranges: list[tuple[int, int, str]] = []
        for item in scene.get("timed_text", []):
            text_id = item["id"]
            if text_id in seen_text_ids:
                raise ScriptValidationError(f"duplicate timed_text id {text_id}")
            seen_text_ids.add(text_id)
            start = item["offset_ms"]
            end = start + item["duration_ms"]
            if end > scene["duration_ms"]:
                raise ScriptValidationError(
                    f"timed_text {text_id} extends past scene {scene_id}"
                )
            if item.get("kind", "subtitle") == "subtitle":
                subtitle_ranges.append((start, end, text_id))
        subtitle_ranges.sort()
        for previous, current in zip(subtitle_ranges, subtitle_ranges[1:]):
            if current[0] < previous[1]:
                raise ScriptValidationError(
                    f"subtitle {current[2]} overlaps subtitle {previous[2]} in scene {scene_id}"
                )

    if expected_start != total_duration:
        raise ScriptValidationError(
            "scene timeline must start at 0ms and continuously cover total_duration_ms"
        )
    required_refs = set(knowledge_package["constraints"]["required_knowledge_refs"])
    if not required_refs.issubset(used_refs):
        missing = ", ".join(sorted(required_refs - used_refs))
        raise ScriptValidationError(
            f"ProductionScript does not cover global required knowledge refs: {missing}"
        )


def _check_refs(
    refs: set[str],
    allowed_refs: set[str],
    units: dict[str, dict[str, Any]],
    owner: str,
) -> None:
    for ref in refs:
        if ref not in allowed_refs:
            raise ScriptValidationError(
                f"{owner} references knowledge unit {ref} outside the selected direction"
            )
        if ref not in units or units[ref]["verification_status"] != "verified":
            raise ScriptValidationError(f"{owner} references unverified knowledge unit {ref}")
