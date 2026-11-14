"""Small durable job snapshots for the local single-process API."""

from __future__ import annotations

import json
import os
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from knowledge.config import repository_root


JOB_STATUSES = {"queued", "running", "script_ready", "failed", "interrupted"}
STAGE_STATUSES = {"pending", "running", "completed", "failed"}


class JobNotFoundError(LookupError):
    """No persisted job snapshot exists for the requested ID."""


class JobStore:
    """Persists public-safe job progress without credentials or model diagnostics."""

    def __init__(self, root_dir: str | Path | None = None) -> None:
        self.root_dir = Path(root_dir) if root_dir else repository_root() / ".local" / "jobs"

    def create(self, project_id: str, project_revision: int) -> dict[str, Any]:
        now = _now()
        job = {
            "job_id": f"JOB_{uuid.uuid4().hex[:16]}",
            "project_id": project_id,
            "status": "queued",
            "current_stage": "knowledge",
            "stages": {"knowledge": "pending", "script": "pending", "animation": "pending"},
            "message": "已加入创作任务",
            "project_revision": project_revision,
            "artifacts": {},
            "error_code": None,
            "created_at": now,
            "updated_at": now,
        }
        self._write(job)
        return job

    def load(self, job_id: str) -> dict[str, Any]:
        if not _valid_job_id(job_id):
            raise JobNotFoundError(job_id)
        try:
            job = json.loads(self._path(job_id).read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise JobNotFoundError(job_id) from exc
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError("Persisted job snapshot is unreadable") from exc
        if not isinstance(job, dict) or job.get("job_id") != job_id:
            raise ValueError("Persisted job snapshot is inconsistent")
        return job

    def update(self, job_id: str, **changes: Any) -> dict[str, Any]:
        job = self.load(job_id)
        updated = {**job, **changes, "updated_at": _now()}
        if updated["status"] not in JOB_STATUSES:
            raise ValueError("Unsupported job status")
        if set(updated["stages"].values()) - STAGE_STATUSES:
            raise ValueError("Unsupported job stage status")
        self._write(updated)
        return updated

    def active_for_project(self, project_id: str) -> dict[str, Any] | None:
        for path in self.root_dir.glob("JOB_*.json"):
            try:
                job = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if job.get("project_id") == project_id and job.get("status") in {"queued", "running"}:
                return job
        return None

    def mark_interrupted(self) -> None:
        for path in self.root_dir.glob("JOB_*.json"):
            try:
                job = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if job.get("status") not in {"queued", "running"}:
                continue
            stages = dict(job.get("stages", {}))
            current_stage = job.get("current_stage")
            if current_stage in stages and stages[current_stage] == "running":
                stages[current_stage] = "failed"
            job["status"] = "interrupted"
            job["stages"] = stages
            job["message"] = "服务刚刚重新启动，这次任务已停止；可以继续使用已发布的成果。"
            job["error_code"] = "temporarily_unavailable"
            job["updated_at"] = _now()
            self._write(job)

    def _write(self, job: dict[str, Any]) -> None:
        self.root_dir.mkdir(parents=True, exist_ok=True)
        target = self._path(job["job_id"])
        descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{target.name}.", suffix=".tmp", dir=self.root_dir
        )
        temporary = Path(temporary_name)
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                json.dump(job, handle, ensure_ascii=False, indent=2)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, target)
        finally:
            temporary.unlink(missing_ok=True)

    def _path(self, job_id: str) -> Path:
        return self.root_dir / f"{job_id}.json"


def _valid_job_id(value: str) -> bool:
    return isinstance(value, str) and len(value) == 20 and value.startswith("JOB_") and all(
        char in "0123456789abcdef" for char in value[4:]
    )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
