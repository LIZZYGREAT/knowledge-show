"""Validate and durably receive user RevisionRequests without executing them."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Callable

from jsonschema import Draft202012Validator

from knowledge.config import repository_root


RevisionArtifactResolver = Callable[
    [dict[str, Any], dict[str, Any]], dict[str, dict[str, Any]] | None
]


class RevisionRequestError(ValueError):
    """A revision request is invalid or targets a stale artifact."""


class RevisionRequestConflict(RevisionRequestError):
    """The project or request ID changed before acceptance."""


class RevisionRequestStore:
    """Stores immutable, schema-valid requests under a local project directory."""

    def __init__(self, root_dir: str | Path | None = None) -> None:
        self.root_dir = (
            Path(root_dir)
            if root_dir
            else repository_root() / ".local" / "revision-requests"
        )
        self.schema_path = repository_root() / "contracts" / "schemas" / "revision-request.schema.json"

    def accept(
        self,
        project: dict[str, Any],
        request: dict[str, Any],
        *,
        artifact_resolver: RevisionArtifactResolver | None = None,
    ) -> dict[str, Any]:
        try:
            schema = json.loads(self.schema_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError("RevisionRequest schema is unavailable") from exc
        errors = list(Draft202012Validator(schema).iter_errors(request))
        if errors:
            raise RevisionRequestError("RevisionRequest does not match its schema")
        if request["project_id"] != project["project_id"] or request["source"] != "user":
            raise RevisionRequestError("RevisionRequest project or source is invalid")
        if request["base_project_revision"] != project["revision"]:
            raise RevisionRequestConflict("ProjectState changed before request acceptance")

        target = request["target_artifact"]
        kind = target["kind"]
        if kind == "project_state":
            current = {"artifact_id": project["project_id"], "revision": project["revision"]}
        else:
            current = project["artifacts"].get(kind)
        if current is None or target["artifact_id"] != current["artifact_id"] or target[
            "revision"
        ] != current["revision"]:
            raise RevisionRequestConflict("RevisionRequest targets a stale artifact version")

        bundle: dict[str, dict[str, Any]] = {"project_state": project}
        if any(anchor["kind"] != "whole_artifact" for anchor in request["anchors"]):
            resolved = artifact_resolver(project, target) if artifact_resolver else None
            if resolved:
                bundle.update(resolved)
            self._validate_anchor_bundle(project, target, request["anchors"], bundle)

        folder = self.root_dir / project["project_id"]
        folder.mkdir(parents=True, exist_ok=True)
        target_path = folder / f"{request['request_id']}.json"
        content = json.dumps(request, ensure_ascii=False, indent=2).encode("utf-8")
        if target_path.exists():
            if target_path.read_bytes() == content:
                return request
            raise RevisionRequestConflict("RevisionRequest ID was already used")

        descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{target_path.name}.", suffix=".tmp", dir=folder
        )
        temporary = Path(temporary_name)
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())
            try:
                os.link(temporary, target_path)
            except FileExistsError:
                if target_path.read_bytes() != content:
                    raise RevisionRequestConflict("RevisionRequest ID was already used")
            if target_path.read_bytes() != content:
                raise RuntimeError("RevisionRequest changed during publication")
        finally:
            temporary.unlink(missing_ok=True)
        return request

    @staticmethod
    def _validate_anchor_bundle(
        project: dict[str, Any],
        target: dict[str, Any],
        anchors: list[dict[str, Any]],
        bundle: dict[str, dict[str, Any]],
    ) -> None:
        kind = target["kind"]
        has_entity_anchor = any(anchor["kind"] != "whole_artifact" for anchor in anchors)
        if has_entity_anchor and kind != "project_state":
            target_snapshot = bundle.get(kind)
            if not isinstance(target_snapshot, dict):
                raise RevisionRequestError("The exact target artifact is not readable")
            if (
                target_snapshot.get("artifact_id") != target["artifact_id"]
                or target_snapshot.get("revision") != target["revision"]
            ):
                raise RevisionRequestConflict("The resolved artifact does not match its exact reference")

        package = bundle.get("knowledge_package")
        script = bundle.get("production_script")
        manifest = bundle.get("animation_manifest")
        for artifact_kind, snapshot in (
            ("knowledge_package", package),
            ("production_script", script),
        ):
            if snapshot is None:
                continue
            expected = project["artifacts"].get(artifact_kind)
            if expected is None or expected != {
                "artifact_id": snapshot.get("artifact_id"),
                "revision": snapshot.get("revision"),
            }:
                raise RevisionRequestConflict(
                    f"The resolved {artifact_kind} does not match its current reference"
                )
            if (
                snapshot.get("project_id") != project["project_id"]
                or snapshot.get("brief_revision") != project["brief"]["revision"]
            ):
                raise RevisionRequestConflict(
                    f"The resolved {artifact_kind} belongs to another project revision"
                )
        if script is not None and script.get("knowledge_package_ref") != project[
            "artifacts"
        ].get("knowledge_package"):
            raise RevisionRequestConflict(
                "The resolved ProductionScript targets a stale KnowledgePackage"
            )
        if manifest is not None:
            if manifest.get("project_id") != project["project_id"]:
                raise RevisionRequestConflict("The AnimationManifest belongs to another project")
            if manifest.get("brief_revision") != project["brief"]["revision"]:
                raise RevisionRequestConflict("The AnimationManifest targets another brief revision")
            script_ref = manifest.get("production_script_ref")
            if script_ref != project["artifacts"].get("production_script"):
                raise RevisionRequestConflict("The AnimationManifest targets a stale ProductionScript")
            if script is not None and script_ref != {
                "artifact_id": script.get("artifact_id"),
                "revision": script.get("revision"),
            }:
                raise RevisionRequestConflict("The resolved ProductionScript does not match the Manifest")
            if script is not None and script.get("knowledge_package_ref") != project[
                "artifacts"
            ].get("knowledge_package"):
                raise RevisionRequestConflict(
                    "The Manifest's ProductionScript targets a stale KnowledgePackage"
                )

        direction_ids = {
            item.get("id") for item in package.get("directions", [])
        } if package else set()
        knowledge_ids = {
            item.get("id") for item in package.get("knowledge_units", [])
        } if package else set()
        scenes = script.get("scenes", []) if script else []
        scene_ids = {scene.get("scene_id") for scene in scenes}
        script_event_ids = {
            event.get("id") for scene in scenes for event in scene.get("events", [])
        }
        timed_text_ids = {
            item.get("id") for scene in scenes for item in scene.get("timed_text", [])
        }
        clips = manifest.get("clips", []) if manifest else []
        clip_ids = {clip.get("clip_id") for clip in clips}
        clip_event_ids = {
            event.get("id")
            for clip in clips
            for event in clip.get("internal_events", [])
        }
        selectable_ids = {
            item.get("id") for item in manifest.get("selectable_elements", [])
        } if manifest else set()

        for anchor in anchors:
            anchor_kind = anchor["kind"]
            anchor_id = anchor.get("id")
            if anchor_kind == "whole_artifact":
                if "id" in anchor:
                    raise RevisionRequestError("whole_artifact anchors cannot include an ID")
            elif anchor_kind == "direction":
                if anchor_id not in direction_ids:
                    raise RevisionRequestError("The direction anchor cannot be resolved")
            elif anchor_kind == "knowledge_unit":
                if anchor_id not in knowledge_ids:
                    raise RevisionRequestError("The knowledge-unit anchor cannot be resolved")
            elif anchor_kind == "scene":
                if kind not in {"project_state", "production_script", "animation_manifest"} or not script:
                    raise RevisionRequestError("Scene anchors require a readable ProductionScript")
                if anchor_id not in scene_ids:
                    raise RevisionRequestError("The scene anchor cannot be resolved")
            elif anchor_kind == "script_event":
                if kind not in {"project_state", "production_script", "animation_manifest"} or not script:
                    raise RevisionRequestError("Script-event anchors require a readable ProductionScript")
                if anchor_id not in script_event_ids:
                    raise RevisionRequestError("The script-event anchor cannot be resolved")
            elif anchor_kind == "timed_text":
                if kind not in {"project_state", "production_script", "animation_manifest"} or not script:
                    raise RevisionRequestError("Timed-text anchors require a readable ProductionScript")
                if anchor_id not in timed_text_ids:
                    raise RevisionRequestError("The timed-text anchor cannot be resolved")
            elif anchor_kind in {"clip", "clip_event", "render_element"}:
                if kind != "animation_manifest" or manifest is None:
                    raise RevisionRequestError("Animation anchors require a readable published Manifest")
                available = {
                    "clip": clip_ids,
                    "clip_event": clip_event_ids,
                    "render_element": selectable_ids,
                }[anchor_kind]
                if anchor_id not in available:
                    raise RevisionRequestError("The animation anchor cannot be resolved")
            elif anchor_kind == "time_range":
                if kind == "animation_manifest":
                    duration = manifest.get("total_duration_ms") if manifest else None
                elif kind == "production_script":
                    duration = script.get("total_duration_ms") if script else None
                else:
                    duration = project["brief"]["effective"].get("target_duration_ms")
                if (
                    not isinstance(duration, int)
                    or anchor["start_ms"] >= anchor["end_ms"]
                    or anchor["end_ms"] > duration
                ):
                    raise RevisionRequestError("The time-range anchor is outside the target video")
