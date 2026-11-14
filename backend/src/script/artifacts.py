"""Immutable, versioned ProductionScript JSON publication."""

from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any

from .validate import validate_production_script


class ScriptArtifactError(RuntimeError):
    """A published script cannot be safely reused or written."""


def script_artifact_id(project_id: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", project_id)
    suffix = hashlib.sha256(project_id.encode("utf-8")).hexdigest()[:10]
    return f"PS_{safe[:45]}_{suffix}"


def prepare_revision(
    script: dict[str, Any], export_dir: str | Path
) -> dict[str, Any]:
    """Reuse an identical published version, otherwise choose the next revision."""
    folder = Path(export_dir)
    folder.mkdir(parents=True, exist_ok=True)
    artifact_id = script["artifact_id"]
    versions = sorted(
        folder.glob(f"{artifact_id}-r*.json"),
        key=lambda path: _revision_from_path(path, artifact_id),
    )
    highest = 0
    candidate_content = _without_revision(script)
    for path in versions:
        revision = _revision_from_path(path, artifact_id)
        highest = max(highest, revision)
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ScriptArtifactError(
                f"Published ProductionScript version {path.name} is unreadable"
            ) from exc
        if not isinstance(existing, dict) or existing.get("revision") != revision:
            raise ScriptArtifactError(
                f"Published ProductionScript version {path.name} has inconsistent metadata"
            )
        if _without_revision(existing) == candidate_content:
            return existing
    return {**script, "revision": highest + 1}


def export_production_script(
    script: dict[str, Any],
    export_dir: str | Path,
    *,
    project_state: dict[str, Any],
    knowledge_package: dict[str, Any],
) -> Path:
    """Atomically write one immutable revision, then read and validate it back."""
    validate_production_script(script, project_state, knowledge_package)
    folder = Path(export_dir)
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"{script['artifact_id']}-r{script['revision']}.json"
    content = json.dumps(script, ensure_ascii=False, indent=2).encode("utf-8")
    if target.exists():
        _assert_same(target, script, project_state, knowledge_package)
        return target

    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{target.name}.", suffix=".tmp", dir=folder
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
            _assert_same(target, script, project_state, knowledge_package)
        published = json.loads(target.read_text(encoding="utf-8"))
        validate_production_script(published, project_state, knowledge_package)
        if published != script:
            raise ScriptArtifactError(
                f"ProductionScript export changed during publication: {target.name}"
            )
        return target
    finally:
        temporary.unlink(missing_ok=True)


def _assert_same(
    path: Path,
    expected: dict[str, Any],
    project_state: dict[str, Any],
    knowledge_package: dict[str, Any],
) -> None:
    try:
        existing = json.loads(path.read_text(encoding="utf-8"))
        validate_production_script(existing, project_state, knowledge_package)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise ScriptArtifactError(
            f"Published ProductionScript version {path.name} is invalid"
        ) from exc
    if existing != expected:
        raise FileExistsError(
            f"ProductionScript version {path.name} already exists with different content"
        )


def _without_revision(value: dict[str, Any]) -> dict[str, Any]:
    return {key: item for key, item in value.items() if key != "revision"}


def _revision_from_path(path: Path, artifact_id: str) -> int:
    match = re.fullmatch(re.escape(artifact_id) + r"-r([1-9][0-9]*)\.json", path.name)
    if not match:
        raise ScriptArtifactError(f"Unexpected script version filename: {path.name}")
    return int(match.group(1))
