"""Local HTTP entry points for the knowledge-to-script production workflow."""

from __future__ import annotations

import asyncio
import ipaddress
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Callable

from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .models import (
    CreateProjectBody,
    DirectionBody,
    ModelTestBody,
    RuntimeServices,
    StartJobBody,
    test_model_connection,
)
from workflow.jobs import JobNotFoundError, JobStore
from workflow.service import (
    WorkflowArtifactNotFound,
    WorkflowError,
    WorkflowOptions,
    read_knowledge_package,
    read_production_script,
    run_until_script,
)
from workflow.state import (
    ProjectNotFoundError,
    ProjectStateConflict,
    ProjectStateError,
    ProjectStateStore,
)


logger = logging.getLogger(__name__)
def create_app(
    *,
    state_store: ProjectStateStore | None = None,
    job_store: JobStore | None = None,
    knowledge_export_dir: str | Path | None = None,
    script_export_dir: str | Path | None = None,
    services_factory: Callable[[str], Any] = RuntimeServices,
    connection_test: Callable[[str], Any] = test_model_connection,
) -> FastAPI:
    projects = state_store or ProjectStateStore()
    jobs = job_store or JobStore()
    active_tasks: set[asyncio.Task[Any]] = set()
    active_by_project: dict[str, str] = {}

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        jobs.mark_interrupted()
        yield
        pending = list(active_tasks)
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)

    app = FastAPI(title="knowledge-show local API", lifespan=lifespan)
    app.state.project_store = projects
    app.state.job_store = jobs
    app.state.active_tasks = active_tasks
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        allow_credentials=False,
    )

    @app.middleware("http")
    async def require_local_client(request: Request, call_next):
        host = request.client.host if request.client else ""
        if host != "testclient":
            try:
                if not ipaddress.ip_address(host).is_loopback:
                    return _error(403, "invalid_input", "本地服务只接受本机请求。")
            except ValueError:
                return _error(403, "invalid_input", "本地服务只接受本机请求。")
        return await call_next(request)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        logger.info("Rejected invalid local API request (%d validation issues)", len(exc.errors()))
        if any(
            error.get("type") == "missing"
            and error.get("loc", ())[-1:] == ("api_key",)
            for error in exc.errors()
        ):
            return _error(422, "missing_key", "请先填写 API Key。")
        return _error(422, "invalid_input", "请求内容不完整或格式不正确，请检查后重试。")

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    @app.post("/api/model/test")
    async def test_model(body: ModelTestBody):
        key = body.api_key.get_secret_value().strip()
        if not key:
            return _error(422, "missing_key", "请先填写 API Key。")
        try:
            connected = await connection_test(key)
        except Exception as exc:
            code, message = _public_error(exc)
            logger.info("Model connection check failed (%s)", code)
            return _error(503 if code != "invalid_key" else 401, code, message)
        return {"connected": bool(connected)}

    @app.post("/api/projects", status_code=201)
    async def create_project(body: CreateProjectBody):
        topic = body.user_input.get("topic")
        if not isinstance(topic, str) or not topic.strip():
            return _error(422, "invalid_input", "请先写下你想讲的主题。")
        try:
            project = projects.create(body.user_input)
        except (ProjectStateError, ValueError):
            return _error(422, "invalid_input", "创作信息不完整或暂不支持，请检查后重试。")
        return {
            "project_id": project["project_id"],
            "project_revision": project["revision"],
            "project": project,
        }

    @app.get("/api/projects/{project_id}")
    async def get_project(project_id: str):
        try:
            return projects.load(project_id)
        except ProjectNotFoundError:
            return _error(404, "invalid_input", "没有找到这个创作项目。")
        except ProjectStateError:
            return _error(422, "invalid_input", "项目编号无效。")

    @app.post("/api/projects/{project_id}/jobs", status_code=202)
    async def start_job(project_id: str, body: StartJobBody):
        key = body.api_key.get_secret_value().strip()
        if not key:
            return _error(422, "missing_key", "请先填写 API Key。")
        try:
            project = projects.load(project_id)
        except ProjectNotFoundError:
            return _error(404, "invalid_input", "没有找到这个创作项目。")
        except ProjectStateError:
            return _error(422, "invalid_input", "项目编号无效。")

        current_id = active_by_project.get(project_id)
        current = jobs.load(current_id) if current_id else None
        if current is not None and current.get("status") not in {"queued", "running"}:
            current = None
            active_by_project.pop(project_id, None)
        current = current or jobs.active_for_project(project_id)
        if current is not None:
            active_by_project[project_id] = current["job_id"]
            return {"job_id": current["job_id"], "status": current["status"]}

        job = jobs.create(project_id, project["revision"])
        active_by_project[project_id] = job["job_id"]
        jobs.update(job["job_id"], status="running")
        task = asyncio.create_task(
            _run_job(
                project_id,
                job["job_id"],
                key,
                body.regenerate,
                projects,
                jobs,
                services_factory,
                active_by_project,
                knowledge_export_dir,
                script_export_dir,
            )
        )
        active_tasks.add(task)
        task.add_done_callback(active_tasks.discard)
        return {"job_id": job["job_id"], "status": "running"}

    @app.get("/api/jobs/{job_id}")
    async def get_job(job_id: str):
        try:
            return jobs.load(job_id)
        except JobNotFoundError:
            return _error(404, "invalid_input", "没有找到这个创作任务。")
        except ValueError:
            return _error(500, "failed", "暂时无法读取任务状态。")

    @app.get("/api/projects/{project_id}/knowledge-package")
    async def get_knowledge_package(
        project_id: str,
        artifact_id: str = Query(min_length=1, max_length=64),
        revision: int = Query(ge=1),
    ):
        try:
            project = projects.load(project_id)
            ref = {"artifact_id": artifact_id, "revision": revision}
            if project["artifacts"].get("knowledge_package") != ref:
                return _error(409, "conflict", "这个知识包版本已不属于项目当前成果。")
            return read_knowledge_package(
                project_id, ref, export_dir=knowledge_export_dir
            )
        except ProjectNotFoundError:
            return _error(404, "invalid_input", "没有找到这个创作项目。")
        except WorkflowArtifactNotFound:
            return _error(404, "invalid_input", "没有找到这个知识包版本。")
        except (ProjectStateError, WorkflowError, ValueError):
            return _error(409, "conflict", "当前知识包暂时无法读取，请刷新项目状态。")

    @app.get("/api/projects/{project_id}/production-script")
    async def get_production_script(
        project_id: str,
        artifact_id: str = Query(min_length=1, max_length=64),
        revision: int = Query(ge=1),
    ):
        try:
            project = projects.load(project_id)
            ref = {"artifact_id": artifact_id, "revision": revision}
            if project["artifacts"].get("production_script") != ref:
                return _error(409, "conflict", "这个脚本版本已不属于项目当前成果。")
            package_ref = project["artifacts"].get("knowledge_package")
            if package_ref is None:
                return _error(409, "conflict", "当前项目还没有可读取的知识包。")
            package = read_knowledge_package(
                project_id, package_ref, export_dir=knowledge_export_dir
            )
            return read_production_script(
                project_id,
                ref,
                project=project,
                package=package,
                export_dir=script_export_dir,
            )
        except ProjectNotFoundError:
            return _error(404, "invalid_input", "没有找到这个创作项目。")
        except WorkflowArtifactNotFound:
            return _error(404, "invalid_input", "没有找到这个脚本版本。")
        except (ProjectStateError, WorkflowError, ValueError):
            return _error(409, "conflict", "当前脚本暂时无法读取，请刷新项目状态。")

    @app.post("/api/projects/{project_id}/direction")
    async def choose_direction(project_id: str, body: DirectionBody):
        try:
            project = projects.load(project_id)
            if project["revision"] != body.expected_project_revision:
                return _error(409, "conflict", "项目已更新，请刷新后重新选择方向。")
            package_ref = project["artifacts"].get("knowledge_package")
            if package_ref is None:
                return _error(409, "conflict", "请先完成知识探索，再选择创作方向。")
            package = read_knowledge_package(
                project_id, package_ref, export_dir=knowledge_export_dir
            )
            if not any(item["id"] == body.direction_id for item in package["directions"]):
                return _error(422, "invalid_input", "这个创作方向不在当前知识包中。")
            return projects.update(
                project_id,
                body.expected_project_revision,
                decisions={
                    "direction_id": body.direction_id,
                    "direction_status": "user_confirmed",
                },
            )
        except ProjectNotFoundError:
            return _error(404, "invalid_input", "没有找到这个创作项目。")
        except ProjectStateConflict:
            return _error(409, "conflict", "项目已更新，请刷新后重试。")
        except WorkflowArtifactNotFound:
            return _error(409, "conflict", "当前知识包版本不存在，请重新运行知识探索。")
        except (ProjectStateError, WorkflowError, ValueError):
            return _error(409, "conflict", "暂时无法更新创作方向，请刷新后重试。")

    @app.get("/api/projects/{project_id}/handoff/animation")
    async def animation_handoff(project_id: str):
        try:
            project = projects.load(project_id)
            script_ref = project["artifacts"].get("production_script")
            base = {
                "project_id": project_id,
                "project_revision": project["revision"],
                "brief": project["brief"]["effective"],
                "direction_id": project["decisions"].get("direction_id"),
            }
            if script_ref is None:
                return {"status": "awaiting_script", **base}
            package_ref = project["artifacts"].get("knowledge_package")
            package = read_knowledge_package(
                project_id, package_ref, export_dir=knowledge_export_dir
            )
            script = read_production_script(
                project_id,
                script_ref,
                project=project,
                package=package,
                export_dir=script_export_dir,
            )
            return {
                "status": "awaiting_animation",
                **base,
                "knowledge_package_ref": package_ref,
                "production_script_ref": script_ref,
                "production_script": script,
            }
        except ProjectNotFoundError:
            return _error(404, "invalid_input", "没有找到这个创作项目。")
        except WorkflowArtifactNotFound:
            return _error(409, "conflict", "当前脚本交接引用不存在，请刷新项目状态。")
        except (ProjectStateError, WorkflowError, ValueError):
            return _error(409, "conflict", "当前项目尚未准备好脚本交接。")

    app.state.connection_test = connection_test
    return app


async def _run_job(
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

        options = services.workflow_options(
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
        code, message = _public_error(exc)
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


def _public_error(exc: Exception) -> tuple[str, str]:
    diagnostic = str(exc).lower()
    name = type(exc).__name__.lower()
    if "missing" in diagnostic and "key" in diagnostic:
        return "missing_key", "请先配置可用的 API Key。"
    if "rejected the api key" in diagnostic or "401" in diagnostic or "403" in diagnostic:
        return "invalid_key", "API Key 无法使用，请检查后重试。"
    if "rate limited" in diagnostic or "429" in diagnostic:
        return "rate_limited", "服务暂时繁忙，请稍后重试。"
    if "timeout" in diagnostic or "connection" in name:
        return "temporarily_unavailable", "暂时无法连接生成服务，请检查网络后重试。"
    if isinstance(exc, ProjectStateConflict):
        return "conflict", "项目状态已更新，请刷新后重试。"
    if isinstance(exc, (ProjectStateError, WorkflowError, ValueError)):
        return "failed", "这一步暂时没有完成，请稍后重试。"
    return "temporarily_unavailable", "生成服务暂时不可用，请稍后重试。"


def _error(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


app = create_app()
