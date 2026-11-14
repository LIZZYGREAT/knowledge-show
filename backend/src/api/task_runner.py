"""Run and persist public-safe snapshots for local generation jobs."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any, Callable

from workflow.jobs import JobStore
from workflow.service import WorkflowOptions, run_until_script
from workflow.state import ProjectStateStore

from .errors import public_error


logger = logging.getLogger(__name__)


async def run_job(
    project_id: str,
    job_id: str,
    api_key: str,
    regenerate: bool,
    projects: ProjectStateStore,
    jobs: JobStore,
    services_factory: Callable[[str], Any],
    active_by_project: dict[str, str],
    knowledge_export_dir: str | Path | None,
    script_export_dir: str | Path | None,
) -> None:
    services = None
    try:
        services = services_factory(api_key)

        async def on_event(event: dict[str, Any]) -> None:
            stage = event.get("stage")
            kind = event.get("kind")
            if stage not in {"knowledge", "script", "animation"}:
                return
            current = jobs.load(job_id)
            stages = dict(current["stages"])
            if kind == "completed" and event.get("artifact"):
                stages[stage] = "completed"
                artifact_name = {
                    "knowledge": "knowledge_package",
                    "script": "production_script",
                }.get(stage)
                artifacts = dict(current["artifacts"])
                if artifact_name:
                    artifacts[artifact_name] = event["artifact"]
                message = _stage_message(stage, "completed")
            elif kind == "failed":
                stages[stage] = "failed"
                artifacts = dict(current["artifacts"])
                message = _stage_message(stage, "failed")
            else:
                stages[stage] = "running"
                artifacts = dict(current["artifacts"])
                message = _stage_message(stage, "running")
            jobs.update(
                job_id,
                status="running",
                current_stage=stage,
                stages=stages,
                artifacts=artifacts,
                message=message,
            )

        options: WorkflowOptions = services.workflow_options(
            regenerate=regenerate,
            knowledge_export_dir=knowledge_export_dir,
            script_export_dir=script_export_dir,
        )
        result = await run_until_script(
            project_id,
            options=options,
            state_store=projects,
            on_event=on_event,
        )
        project = result["project"]
        artifacts = {
            "knowledge_package": project["artifacts"]["knowledge_package"],
            "production_script": project["artifacts"]["production_script"],
        }
        stages = {"knowledge": "completed", "script": "completed", "animation": "pending"}
        jobs.update(
            job_id,
            status="script_ready",
            current_stage="animation",
            stages=stages,
            artifacts=artifacts,
            project_revision=project["revision"],
            error_code=None,
            message="脚本准备完成，等待动画制作。",
        )
    except asyncio.CancelledError:
        current = jobs.load(job_id)
        stages = dict(current["stages"])
        stage = current.get("current_stage")
        if stage in stages and stages[stage] == "running":
            stages[stage] = "failed"
        jobs.update(
            job_id,
            status="interrupted",
            stages=stages,
            message="服务刚刚停止，这次任务未完成；已发布的成果仍可继续使用。",
            error_code="temporarily_unavailable",
        )
        raise
    except Exception as exc:
        code, message = public_error(exc)
        logger.error("Local generation job failed (%s, %s)", job_id, code)
        current = jobs.load(job_id)
        stages = dict(current["stages"])
        stage = current.get("current_stage")
        if stage in stages and stages[stage] != "completed":
            stages[stage] = "failed"
        jobs.update(
            job_id,
            status="failed",
            stages=stages,
            error_code=code,
            message=message,
        )
    finally:
        if services is not None:
            try:
                await services.close()
            except Exception:
                logger.warning("Could not close per-job model clients")
        if active_by_project.get(project_id) == job_id:
            active_by_project.pop(project_id, None)


def _stage_message(stage: str, state: str) -> str:
    messages = {
        ("knowledge", "running"): "正在探索知识与讲述方向",
        ("knowledge", "completed"): "知识方向已经准备好",
        ("knowledge", "failed"): "知识准备暂时没有完成，请重试。",
        ("script", "running"): "正在安排讲述顺序与场景节奏",
        ("script", "completed"): "脚本方案已经准备好",
        ("script", "failed"): "脚本暂时没有完成，请重试这一步。",
        ("animation", "running"): "正在准备动画制作",
        ("animation", "completed"): "动画资源已准备好",
        ("animation", "failed"): "动画制作暂时没有完成，请重试。",
    }
    return messages[(stage, state)]
