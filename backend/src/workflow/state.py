"""Versioned ProjectState storage for the local single-process workflow."""

from __future__ import annotations

import json
import os
import re
import tempfile
import threading
import uuid
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from knowledge.brief import build_brief
from knowledge.config import repository_root


class ProjectNotFoundError(LookupError):
    """No persisted ProjectState exists for the requested project."""


class ProjectStateConflict(RuntimeError):
    """The ProjectState changed while a workflow was producing an artifact."""


class ProjectStateError(ValueError):
    """Persisted or requested ProjectState data does not match the contract."""


_LOCKS: dict[str, threading.RLock] = {}
_LOCKS_GUARD = threading.Lock()
_PROJECT_ID = re.compile(r"^[A-Za-z][A-Za-z0-9_-]{0,63}$")
_REVISION_FILE = re.compile(r"^project-r([1-9][0-9]*)\.json$")


@lru_cache(maxsize=1)
def _project_schema() -> dict[str, Any]:
    path = repository_root() / "contracts" / "schemas" / "project-state.schema.json"
    return json.loads(path.read_text(encoding="utf-8"))


class ProjectStateStore:
    """Stores each accepted state revision as an immutable JSON file."""

    def __init__(self, root_dir: str | Path | None = None) -> None:
        self.root_dir = Path(root_dir) if root_dir else repository_root() / ".local" / "projects"

    def create(self, user_input: dict[str, Any]) -> dict[str, Any]:
        brief = build_brief(user_input)
        for _ in range(5):
            project_id = f"P_{uuid.uuid4().hex[:16]}"
            project = {
                "project_id": project_id,
                "revision": 1,
                "brief": brief,
                "decisions": {},
                "artifacts": {},
            }
            self._validate(project)
            folder = self._project_dir(project_id)
            try:
                folder.mkdir(parents=True, exist_ok=False)
            except FileExistsError:
                continue
            self._write_revision(project, folder)
            return project
        raise ProjectStateError("Could not allocate a unique project id")

    def load(self, project_id: str) -> dict[str, Any]:
        folder = self._project_dir(project_id)
        lock = _lock_for(folder)
        with lock:
            return self._load_unlocked(project_id, folder)

    def load_revision(self, project_id: str, revision: int) -> dict[str, Any]:
        if revision < 1:
            raise ProjectNotFoundError(f"ProjectState revision {revision} does not exist")
        folder = self._project_dir(project_id)
        path = folder / f"project-r{revision}.json"
        try:
            project = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise ProjectNotFoundError(
                f"ProjectState revision {revision} does not exist"
            ) from exc
        except (OSError, json.JSONDecodeError) as exc:
            raise ProjectStateError("Persisted ProjectState is unreadable") from exc
        self._validate(project)
        if project["project_id"] != project_id or project["revision"] != revision:
            raise ProjectStateError("ProjectState filename and content disagree")
        return project

    def update(
        self,
        project_id: str,
        expected_revision: int,
        *,
        decisions: dict[str, Any] | None = None,
        artifacts: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        folder = self._project_dir(project_id)
        lock = _lock_for(folder)
        with lock:
            current = self._load_unlocked(project_id, folder)
            if current["revision"] != expected_revision:
                raise ProjectStateConflict(
                    "ProjectState changed before this update could be published"
                )
            updated = deepcopy(current)
            changed = False
            if decisions is not None and decisions != current["decisions"]:
                updated["decisions"] = deepcopy(decisions)
                changed = True
            if artifacts is not None and artifacts != current["artifacts"]:
                updated["artifacts"] = deepcopy(artifacts)
                changed = True
            if not changed:
                return current
            updated["revision"] = current["revision"] + 1
            self._validate(updated)
            self._write_revision(updated, folder)
            return updated

    def publish_artifact_ref(
        self,
        project_id: str,
        expected_revision: int,
        artifact_name: str,
        ref: dict[str, Any],
    ) -> dict[str, Any]:
        if artifact_name not in {
            "knowledge_package",
            "production_script",
            "animation_manifest",
        }:
            raise ValueError(f"Unsupported ProjectState artifact name: {artifact_name}")
        if not isinstance(ref, dict) or set(ref) != {"artifact_id", "revision"}:
            raise ProjectStateError("ArtifactRef must contain artifact_id and revision")
        current = self.load(project_id)
        if current["revision"] != expected_revision:
            raise ProjectStateConflict(
                "ProjectState changed before this artifact reference could be published"
            )
        artifacts = deepcopy(current["artifacts"])
        artifacts[artifact_name] = deepcopy(ref)
        return self.update(
            project_id,
            expected_revision,
            artifacts=artifacts,
        )

    def _load_unlocked(self, project_id: str, folder: Path) -> dict[str, Any]:
        if not folder.is_dir():
            raise ProjectNotFoundError(f"Project {project_id} does not exist")
        revisions: list[tuple[int, Path]] = []
        for path in folder.glob("project-r*.json"):
            match = _REVISION_FILE.fullmatch(path.name)
            if match:
                revisions.append((int(match.group(1)), path))
        if not revisions:
            raise ProjectNotFoundError(f"Project {project_id} does not exist")
        revision, path = max(revisions, key=lambda item: item[0])
        try:
            project = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ProjectStateError("Latest ProjectState revision is unreadable") from exc
        self._validate(project)
        if project["project_id"] != project_id or project["revision"] != revision:
            raise ProjectStateError("Persisted ProjectState filename and content disagree")
        return project

    def _write_revision(self, project: dict[str, Any], folder: Path) -> Path:
        target = folder / f"project-r{project['revision']}.json"
        content = json.dumps(project, ensure_ascii=False, indent=2).encode("utf-8")
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
                existing = json.loads(target.read_text(encoding="utf-8"))
                if existing != project:
                    raise ProjectStateConflict(
                        f"ProjectState revision {project['revision']} already exists"
                    )
            readback = json.loads(target.read_text(encoding="utf-8"))
            self._validate(readback)
            if readback != project:
                raise ProjectStateError("ProjectState changed during atomic publication")
            return target
        finally:
            temporary.unlink(missing_ok=True)

    def _project_dir(self, project_id: str) -> Path:
        if not isinstance(project_id, str) or not _PROJECT_ID.fullmatch(project_id):
            raise ProjectStateError("project_id is invalid")
        return self.root_dir / project_id

    @staticmethod
    def _validate(project: dict[str, Any]) -> None:
        errors = sorted(
            Draft202012Validator(_project_schema()).iter_errors(project),
            key=lambda error: list(error.absolute_path),
        )
        if errors:
            details = "; ".join(
                f"{'.'.join(map(str, error.absolute_path)) or 'ProjectState'}: {error.message}"
                for error in errors[:8]
            )
            raise ProjectStateError(f"ProjectState schema validation failed: {details}")


def _lock_for(folder: Path) -> threading.RLock:
    key = str(folder.resolve())
    with _LOCKS_GUARD:
        return _LOCKS.setdefault(key, threading.RLock())
