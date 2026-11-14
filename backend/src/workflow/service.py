"""Coordinate knowledge and script production through published artifacts."""

from __future__ import annotations

import asyncio
import inspect
import json
import re
import threading
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any, Callable

from knowledge.config import load_settings, repository_root
from knowledge.package import validate_knowledge_package
from knowledge.service import RunOptions, generate_knowledge_package
from script.service import generate_production_script
from script.validate import selected_direction, validate_production_script

from .state import ProjectStateStore


class WorkflowError(RuntimeError):
    """A workflow could not complete its next publishable stage."""


class WorkflowArtifactNotFound(WorkflowError):
    """A ProjectState reference does not resolve to a published artifact."""


@dataclass(slots=True)
class WorkflowOptions:
    mode: str = "real"
    force_knowledge: bool = False
    regenerate_script: bool = False
    knowledge_options: RunOptions | None = None
    script_client: Any | None = None
    knowledge_export_dir: str | Path | None = None
    script_export_dir: str | Path | None = None

    def __post_init__(self) -> None:
        if self.mode not in {"real", "mock"}:
            raise ValueError("workflow mode must be 'real' or 'mock'")


_PROJECT_RUN_LOCKS: dict[str, asyncio.Lock] = {}
_PROJECT_RUN_LOCKS_GUARD = threading.Lock()


def _project_run_lock(project_id: str) -> asyncio.Lock:
    with _PROJECT_RUN_LOCKS_GUARD:
        return _PROJECT_RUN_LOCKS.setdefault(project_id, asyncio.Lock())


async def _notify(
    callback: Callable[[dict[str, Any]], Any] | None,
    event: dict[str, Any],
) -> None:
    if callback is None:
        return
    result = callback(event)
    if inspect.isawaitable(result):
        await result


async def run_until_script(
    project_id: str,
    *,
    options: WorkflowOptions,
    state_store: ProjectStateStore | None = None,
    on_event: Callable[[dict[str, Any]], Any] | None = None,
) -> dict[str, Any]:
    """Run through a published ProductionScript without starting animation work."""
    lock = _project_run_lock(project_id)
    async with lock:
        return await _run_until_script_locked(
            project_id,
            options=options,
            state_store=state_store,
            on_event=on_event,
        )


async def _run_until_script_locked(
    project_id: str,
    *,
    options: WorkflowOptions,
    state_store: ProjectStateStore | None,
    on_event: Callable[[dict[str, Any]], Any] | None,
) -> dict[str, Any]:
    store = state_store or ProjectStateStore()
    project = store.load(project_id)
    if project["brief"]["effective"]["aspect_ratio"] != "16:9":
        raise WorkflowError("当前版本仅支持 16:9 视频画幅。")

    knowledge_export_dir = _knowledge_export_dir(options)
    package_ref = project["artifacts"].get("knowledge_package")
    if package_ref is not None and not options.force_knowledge:
        package = read_knowledge_package(
            project_id,
            package_ref,
            export_dir=knowledge_export_dir,
        )
        await _notify(
            on_event,
            {
                "stage": "knowledge",
                "kind": "completed",
                "message": "已复用准备好的知识方向",
                "artifact": package_ref,
                "diagnostic": {"source": "published_artifact_reuse"},
            },
        )
    else:
        knowledge_options = _knowledge_options(options, knowledge_export_dir)
        package = await generate_knowledge_package(
            project_id,
            project["brief"],
            run_options=knowledge_options,
            on_event=lambda raw: _relay_knowledge_event(raw, on_event),
        )
        package_ref = _artifact_ref(package)
        project = store.publish_artifact_ref(
            project_id,
            project["revision"],
            "knowledge_package",
            package_ref,
        )
        await _notify(
            on_event,
            {
                "stage": "knowledge",
                "kind": "completed",
                "message": "知识方向已经准备好",
                "artifact": package_ref,
                "diagnostic": {"source": "newly_published_artifact"},
            },
        )

    # Re-read the exact file from disk even after generation; the artifact file is
    # the handoff boundary shared with the independently owned script layer.
    package = read_knowledge_package(
        project_id,
        package_ref,
        export_dir=knowledge_export_dir,
    )
    project = _ensure_direction(project, package, store)

    current_script_ref = project["artifacts"].get("production_script")
    if current_script_ref is not None and not options.regenerate_script:
        current_script = read_production_script(
            project_id,
            current_script_ref,
            project=project,
            package=package,
            export_dir=options.script_export_dir,
        )
        await _notify(
            on_event,
            {
                "stage": "script",
                "kind": "completed",
                "message": "已复用当前有效的脚本方案",
                "artifact": current_script_ref,
                "diagnostic": {"source": "published_artifact_reuse"},
            },
        )
        return {
            "project": project,
            "knowledge_package": package,
            "production_script": current_script,
        }

    if options.script_client is None:
        raise WorkflowError("脚本生成服务未配置。")

    script = await generate_production_script(
        project,
        package,
        llm_client=options.script_client,
        export_dir=options.script_export_dir,
        on_event=lambda raw: _relay_script_event(raw, on_event),
    )
    validate_production_script(script, project, package)
    script_ref = _artifact_ref(script)
    project = store.publish_artifact_ref(
        project_id,
        project["revision"],
        "production_script",
        script_ref,
    )
    await _notify(
        on_event,
        {
            "stage": "script",
            "kind": "completed",
            "message": "脚本方案已经准备好",
            "artifact": script_ref,
            "diagnostic": {"source": "newly_published_artifact"},
        },
    )
    return {
        "project": project,
        "knowledge_package": package,
        "production_script": script,
    }


def read_knowledge_package(
    project_id: str,
    artifact_ref: dict[str, Any],
    *,
    export_dir: str | Path | None = None,
) -> dict[str, Any]:
    path = _artifact_path("KnowledgePackage", artifact_ref, export_dir or _knowledge_export_dir(None))
    package = _read_json(path, "KnowledgePackage")
    validate_knowledge_package(package)
    if (
        package["project_id"] != project_id
        or package["artifact_id"] != artifact_ref["artifact_id"]
        or package["revision"] != artifact_ref["revision"]
    ):
        raise WorkflowError("Published KnowledgePackage content does not match its reference")
    return package


def read_production_script(
    project_id: str,
    artifact_ref: dict[str, Any],
    *,
    project: dict[str, Any],
    package: dict[str, Any],
    export_dir: str | Path | None = None,
) -> dict[str, Any]:
    path = _artifact_path(
        "ProductionScript",
        artifact_ref,
        export_dir or repository_root() / ".local" / "script-exports",
    )
    script = _read_json(path, "ProductionScript")
    validate_production_script(script, project, package)
    if (
        script["project_id"] != project_id
        or script["artifact_id"] != artifact_ref["artifact_id"]
        or script["revision"] != artifact_ref["revision"]
    ):
        raise WorkflowError("Published ProductionScript content does not match its reference")
    return script


def _ensure_direction(
    project: dict[str, Any], package: dict[str, Any], store: ProjectStateStore
) -> dict[str, Any]:
    direction_id = project["decisions"].get("direction_id")
    if direction_id:
        try:
            selected_direction(project, package)
            return project
        except ValueError as exc:
            status = project["decisions"].get("direction_status")
            if status != "system_default":
                raise WorkflowError(
                    "当前知识包已不包含你确认的方向，请重新选择后继续。"
                ) from exc
    direction_id = package["recommended_direction_id"]
    decisions = {
        "direction_id": direction_id,
        "direction_status": "system_default",
    }
    return store.update(
        project["project_id"],
        project["revision"],
        decisions=decisions,
    )


def _knowledge_options(
    options: WorkflowOptions, export_dir: Path
) -> RunOptions:
    current = options.knowledge_options or RunOptions(mode=options.mode)
    return replace(
        current,
        mode=options.mode,
        force_refresh=current.force_refresh or options.force_knowledge,
        export_dir=str(export_dir),
    )


def _knowledge_export_dir(options: WorkflowOptions | None) -> Path:
    if options is not None and options.knowledge_export_dir is not None:
        return Path(options.knowledge_export_dir)
    if options is not None and options.knowledge_options is not None:
        configured = options.knowledge_options.export_dir
        if configured:
            return Path(configured)
    return load_settings().export_dir


def _artifact_path(
    kind: str, artifact_ref: dict[str, Any], export_dir: str | Path
) -> Path:
    if not isinstance(artifact_ref, dict):
        raise WorkflowArtifactNotFound(f"Published {kind} reference is missing")
    artifact_id = artifact_ref.get("artifact_id")
    revision = artifact_ref.get("revision")
    if (
        not isinstance(artifact_id, str)
        or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{0,63}", artifact_id)
        or not isinstance(revision, int)
        or isinstance(revision, bool)
        or revision < 1
    ):
        raise WorkflowError(f"Published {kind} reference is invalid")
    return Path(export_dir) / f"{artifact_id}-r{revision}.json"


def _read_json(path: Path, kind: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise WorkflowArtifactNotFound(f"Published {kind} version does not exist") from exc
    except (OSError, json.JSONDecodeError) as exc:
        raise WorkflowError(f"Published {kind} version is unreadable") from exc
    if not isinstance(value, dict):
        raise WorkflowError(f"Published {kind} version must be a JSON object")
    return value


def _artifact_ref(artifact: dict[str, Any]) -> dict[str, Any]:
    return {"artifact_id": artifact["artifact_id"], "revision": artifact["revision"]}


async def _relay_knowledge_event(
    raw: dict[str, Any], callback: Callable[[dict[str, Any]], Any] | None
) -> None:
    phase = raw.get("phase")
    event_type = raw.get("event_type")
    messages = {
        "brief": "已理解你的创作想法",
        "research": "正在了解这个主题",
        "search": "正在补充关键资料",
        "fetch": "正在补充关键资料",
        "creative": "正在寻找有趣的讲述角度",
        "verifier": "正在确认重要知识",
        "delivery": "知识方向已经准备好",
    }
    if event_type == "failed":
        kind, message = "failed", "知识准备暂时没有完成，请重试。"
    elif phase == "delivery" and event_type == "completed":
        # The workflow publishes the ProjectState reference before reporting done.
        await _notify(callback, {"diagnostic": {"source": "knowledge", "event": raw}})
        return
    elif phase == "delivery":
        await _notify(callback, {"diagnostic": {"source": "knowledge", "event": raw}})
        return
    elif phase == "brief" and event_type != "completed":
        return
    else:
        kind = "progress" if event_type in {"started", "progress", "completed"} else None
        message = messages.get(phase)
    if kind is None or message is None:
        await _notify(callback, {"diagnostic": {"source": "knowledge", "event": raw}})
        return
    await _notify(
        callback,
        {
            "stage": "knowledge",
            "kind": kind,
            "message": message,
            "diagnostic": {"source": "knowledge", "event": raw},
        },
    )


async def _relay_script_event(
    raw: dict[str, Any], callback: Callable[[dict[str, Any]], Any] | None
) -> None:
    event_type = raw.get("event_type")
    if event_type == "completed":
        # Do not report completion until the ProjectState ArtifactRef is published.
        await _notify(callback, {"diagnostic": {"source": "script", "event": raw}})
        return
    if event_type == "failed":
        stage_event = {
            "stage": "script",
            "kind": "failed",
            "message": "脚本暂时没有完成，请重试这一步。",
        }
    else:
        stage_event = {
            "stage": "script",
            "kind": "started" if event_type == "started" else "progress",
            "message": "正在安排讲述顺序与场景节奏",
        }
    stage_event["diagnostic"] = {"source": "script", "event": raw}
    await _notify(callback, stage_event)
