"""Validate incoming AnimationManifest candidates without publishing false readiness."""

from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from knowledge.config import repository_root


class AnimationManifestError(ValueError):
    """An incoming manifest does not match the current script or local assets."""


class AnimationManifestConflict(AnimationManifestError):
    """The incoming manifest targets a stale version or reuses a version ID."""


class AnimationManifestCandidateStore:
    """Stores validated candidates separately from published ProjectState artifacts."""

    def __init__(
        self,
        root_dir: str | Path | None = None,
        *,
        resource_root: str | Path | None = None,
    ) -> None:
        root = repository_root()
        self.root_dir = (
            Path(root_dir)
            if root_dir
            else root / ".local" / "animation-manifest-candidates"
        )
        self.resource_root = (
            Path(resource_root)
            if resource_root
            else root / ".local" / "animation-resources"
        )
        self.schema_path = root / "contracts" / "schemas" / "animation-manifest.schema.json"

    def has_candidate(self, project_id: str) -> bool:
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{0,63}", project_id):
            return False
        return any((self.root_dir / project_id).glob("*-r*.json"))

    def accept(
        self,
        project: dict[str, Any],
        script: dict[str, Any],
        manifest: dict[str, Any],
    ) -> dict[str, Any]:
        self._validate(project, script, manifest)
        project_dir = self.root_dir / project["project_id"]
        project_dir.mkdir(parents=True, exist_ok=True)
        target = project_dir / f"{manifest['artifact_id']}-r{manifest['revision']}.json"
        content = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")
        if target.exists():
            if target.read_bytes() == content:
                return manifest
            raise AnimationManifestConflict("AnimationManifest candidate version already exists")

        descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{target.name}.", suffix=".tmp", dir=project_dir
        )
        temporary = Path(temporary_name)
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())
            try:
                os.link(temporary, target)
            except FileExistsError:
                if target.read_bytes() != content:
                    raise AnimationManifestConflict(
                        "AnimationManifest candidate version already exists"
                    )
            if target.read_bytes() != content:
                raise RuntimeError("AnimationManifest candidate changed during publication")
        finally:
            temporary.unlink(missing_ok=True)
        return manifest

    def _validate(
        self,
        project: dict[str, Any],
        script: dict[str, Any],
        manifest: dict[str, Any],
    ) -> None:
        try:
            schema = json.loads(self.schema_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError("AnimationManifest schema is unavailable") from exc
        errors = list(Draft202012Validator(schema).iter_errors(manifest))
        if errors:
            raise AnimationManifestError("AnimationManifest does not match its schema")
        if manifest["project_id"] != project["project_id"]:
            raise AnimationManifestError("AnimationManifest project_id is stale")
        if manifest["brief_revision"] != project["brief"]["revision"]:
            raise AnimationManifestConflict("AnimationManifest brief revision is stale")
        script_ref = project["artifacts"].get("production_script")
        expected_script_ref = {
            "artifact_id": script["artifact_id"],
            "revision": script["revision"],
        }
        if script_ref != expected_script_ref or manifest["production_script_ref"] != script_ref:
            raise AnimationManifestConflict("AnimationManifest ProductionScript reference is stale")
        if manifest["total_duration_ms"] != script["total_duration_ms"]:
            raise AnimationManifestError("AnimationManifest duration does not match the script")

        scene_events: dict[str, set[str]] = {}
        scene_ranges: dict[str, tuple[int, int]] = {}
        event_ids: set[str] = set()
        timed_text_ids: set[str] = set()
        for scene in script["scenes"]:
            scene_events[scene["scene_id"]] = {event["id"] for event in scene["events"]}
            scene_ranges[scene["scene_id"]] = (
                scene["start_ms"],
                scene["start_ms"] + scene["duration_ms"],
            )
            event_ids.update(scene_events[scene["scene_id"]])
            timed_text_ids.update(item["id"] for item in scene.get("timed_text", []))

        cursor = 0
        for clip in sorted(manifest["clips"], key=lambda item: item["start_ms"]):
            scene_id = clip["scene_id"]
            if scene_id not in scene_events:
                raise AnimationManifestError("AnimationManifest clip references an unknown scene")
            if clip["start_ms"] != cursor:
                raise AnimationManifestError("AnimationManifest clips must continuously cover the script")
            cursor += clip["duration_ms"]
            scene_start, scene_end = scene_ranges[scene_id]
            if clip["start_ms"] < scene_start or cursor > scene_end:
                raise AnimationManifestError("AnimationManifest clip time does not match its scene")
            refs = set(clip.get("script_event_refs", []))
            if not refs.issubset(scene_events[scene_id]):
                raise AnimationManifestError("AnimationManifest clip references an event from another scene")
            for event in clip.get("internal_events", []):
                duration = event.get("duration_ms", 0)
                if event["offset_ms"] + duration > clip["duration_ms"]:
                    raise AnimationManifestError("AnimationManifest internal event exceeds its clip")
                if not set(event.get("script_event_refs", [])).issubset(refs):
                    raise AnimationManifestError("AnimationManifest internal event references an unlisted script event")
            self._require_resource(clip["resource_ref"])
        if cursor != manifest["total_duration_ms"]:
            raise AnimationManifestError("AnimationManifest clips do not cover the full script")

        if not manifest.get("preview_ref"):
            raise AnimationManifestError("AnimationManifest preview_ref is required for handoff")
        self._require_resource(manifest["preview_ref"])
        selectable_ids: set[str] = set()
        for item in manifest.get("selectable_elements", []):
            if item["id"] in selectable_ids:
                raise AnimationManifestError("AnimationManifest selectable element IDs must be unique")
            selectable_ids.add(item["id"])
            source_ref = item.get("source_ref")
            if source_ref:
                available = event_ids if source_ref["kind"] == "script_event" else timed_text_ids
                if source_ref["id"] not in available:
                    raise AnimationManifestError("AnimationManifest selectable element source is unknown")

    def _require_resource(self, reference: str) -> None:
        if not isinstance(reference, str) or not reference or "\\" in reference:
            raise AnimationManifestError("Animation resource reference is invalid")
        if re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", reference) or Path(reference).is_absolute():
            raise AnimationManifestError("Animation resource reference must be local and relative")
        root = self.resource_root.resolve()
        try:
            target = (root / reference).resolve(strict=True)
        except (OSError, RuntimeError) as exc:
            raise AnimationManifestError("Animation resource does not exist") from exc
        if root not in target.parents or not target.is_file():
            raise AnimationManifestError("Animation resource must be a file inside the local resource directory")
