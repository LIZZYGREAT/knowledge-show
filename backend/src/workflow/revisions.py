"""Validate and durably receive user RevisionRequests without executing them."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from knowledge.config import repository_root


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
        self, project: dict[str, Any], request: dict[str, Any]
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
