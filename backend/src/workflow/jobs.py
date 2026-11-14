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
DISPLAY_EVENT_LIMIT = 10

_DISPLAY_EVENT_CATALOG = {
    "knowledge.brief": ("knowledge", "已理解你的创作想法"),
    "knowledge.research.started": ("knowledge", "正在了解这个主题"),
    "knowledge.research.completed": ("knowledge", "主题探索已结束"),
    "knowledge.references.started": ("knowledge", "正在补充关键资料"),
    "knowledge.references.completed": ("knowledge", "关键资料已补充"),
    "knowledge.creative.started": ("knowledge", "正在寻找有趣的讲述角度"),
    "knowledge.creative.completed": ("knowledge", "讲述角度已整理"),
    "knowledge.verification.started": ("knowledge", "正在确认重要知识"),
    "knowledge.verification.completed": ("knowledge", "重要知识核查已结束"),
    "knowledge.processing": ("knowledge", "正在探索知识与讲述方向"),
    "knowledge.ready": ("knowledge", "知识方向已经准备好"),
    "knowledge.reused": ("knowledge", "已复用准备好的知识方向"),
    "knowledge.failed": ("knowledge", "知识准备暂时没有完成，请重试。"),
    "script.planning": ("script", "正在安排讲述顺序与场景节奏"),
    "script.ready": ("script", "脚本方案已经准备好"),
    "script.reused": ("script", "已复用当前有效的脚本方案"),
    "script.failed": ("script", "脚本暂时没有完成，请重试这一步。"),
}
_DISPLAY_EVENT_CODES = {
    (stage, text): code for code, (stage, text) in _DISPLAY_EVENT_CATALOG.items()
}


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
            "display_events": [],
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
        if "display_events" in job:
            job["display_events"] = _safe_display_events(job["display_events"])
        return job

    def update(self, job_id: str, **changes: Any) -> dict[str, Any]:
        job = self.load(job_id)
        display_event = changes.pop("display_event", None)
        updated = {**job, **changes, "updated_at": _now()}
        if display_event is not None:
            updated["display_events"] = _append_display_event(
                updated.get("display_events", []), display_event
            )
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


def _append_display_event(
    current: Any, event: Any
) -> list[dict[str, Any]]:
    if (
        not isinstance(event, tuple)
        or len(event) != 2
        or not isinstance(event[0], str)
        or not isinstance(event[1], str)
    ):
        return _safe_display_events(current)
    stage, message = event
    code = _DISPLAY_EVENT_CODES.get((stage, message))
    if code is None:
        return _safe_display_events(current)

    events = _safe_display_events(current)
    if any(item["code"] == code and item["text"] == message for item in events):
        return events
    seq = events[-1]["seq"] + 1 if events else 1
    events.append({"seq": seq, "stage": stage, "code": code, "text": message})
    return events[-DISPLAY_EVENT_LIMIT:]


def _safe_display_events(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    valid: dict[int, dict[str, Any]] = {}
    for item in value:
        if not isinstance(item, dict):
            continue
        seq = item.get("seq")
        code = item.get("code")
        if (
            isinstance(seq, bool)
            or not isinstance(seq, int)
            or seq < 1
            or not isinstance(code, str)
            or code not in _DISPLAY_EVENT_CATALOG
        ):
            continue
        stage, text = _DISPLAY_EVENT_CATALOG[code]
        if item.get("stage") != stage:
            continue
        valid[seq] = {"seq": seq, "stage": stage, "code": code, "text": text}
    ordered: list[dict[str, Any]] = []
    for seq in sorted(valid):
        item = valid[seq]
        if ordered and item["code"] == ordered[-1]["code"] and item["text"] == ordered[-1]["text"]:
            continue
        ordered.append(item)
    return ordered[-DISPLAY_EVENT_LIMIT:]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
