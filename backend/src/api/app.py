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

from .errors import error_response as _error, public_error as _public_error
from .models import (
    CreateProjectBody,
    DirectionBody,
    ModelTestBody,
    RuntimeServices,
    StartJobBody,
    test_model_connection,
)
from .task_runner import run_job as _run_job
from workflow.jobs import JobNotFoundError, JobStore
from workflow.animation import (
    AnimationManifestCandidateStore,
    AnimationManifestConflict,
    AnimationManifestError,
)
from workflow.revisions import (
    RevisionRequestConflict,
    RevisionRequestError,
    RevisionRequestStore,
)
from workflow.service import (
    WorkflowArtifactNotFound,
    WorkflowError,
    read_knowledge_package,
    read_production_script,
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
    revision_store: RevisionRequestStore | None = None,
    animation_manifest_store: AnimationManifestCandidateStore | None = None,
    knowledge_export_dir: str | Path | None = None,
    script_export_dir: str | Path | None = None,
    services_factory: Callable[[str], Any] = RuntimeServices,
    connection_test: Callable[[str], Any] = test_model_connection,
) -> FastAPI:
    projects = state_store or ProjectStateStore()
    jobs = job_store or JobStore()
    revisions = revision_store or RevisionRequestStore()
    manifests = animation_manifest_store or AnimationManifestCandidateStore()
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
    app.state.revision_store = revisions
    app.state.animation_manifest_store = manifests
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

    @app.get("/api/projects/{project_id}/preview")
    async def preview_status(project_id: str):
        try:
            project = projects.load(project_id)
        except ProjectNotFoundError:
            return _error(404, "invalid_input", "没有找到这个创作项目。")
        except ProjectStateError:
            return _error(422, "invalid_input", "项目编号无效。")
        if project["artifacts"].get("animation_manifest") is None:
            if project["artifacts"].get("production_script") is None:
                return {
                    "status": "not_ready",
                    "message": "当前项目尚未发布脚本，动画交接仍在等待中。",
                }
            if manifests.has_current_candidate(project):
                return {
                    "status": "not_ready",
                    "message": "动画产物已通过交接校验，但通用播放器尚未接入，当前不能预览。",
                }
            return {
                "status": "not_ready",
                "message": "当前脚本版本尚无匹配的动画候选，或没有可加载的真实动画资源。",
            }
        return {
            "status": "not_ready",
            "message": "当前预览运行时尚不能加载这个 AnimationManifest。",
        }

    @app.post("/api/projects/{project_id}/revision-requests", status_code=202)
    async def receive_revision_request(project_id: str, request_body: dict[str, Any]):
        try:
            project = projects.load(project_id)
            if request_body.get("project_id") != project_id:
                return _error(422, "invalid_input", "修改请求没有指向当前项目。")
            revisions.accept(project, request_body)
        except ProjectNotFoundError:
            return _error(404, "invalid_input", "没有找到这个创作项目。")
        except ProjectStateError:
            return _error(422, "invalid_input", "项目编号无效。")
        except RevisionRequestConflict:
            return _error(409, "conflict", "项目或目标版本已更新，请刷新后重新提交。")
        except RevisionRequestError:
            return _error(422, "invalid_input", "修改请求格式不正确或目标版本无效。")
        return {
            "request_id": request_body["request_id"],
            "status": "received",
            "message": "已收到修改请求；当前版本暂不支持自动修改，原成果未发生变化。",
        }

    @app.post("/api/projects/{project_id}/animation-manifest", status_code=202)
    async def receive_animation_manifest(
        project_id: str, manifest: dict[str, Any]
    ):
        try:
            project = projects.load(project_id)
            script_ref = project["artifacts"].get("production_script")
            package_ref = project["artifacts"].get("knowledge_package")
            if script_ref is None or package_ref is None:
                return _error(409, "conflict", "请先完成知识探索和脚本编排，再提交动画产物。")
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
            manifests.accept(project, script, manifest)
            latest = projects.load(project_id)
            if (
                latest["revision"] != project["revision"]
                or latest["artifacts"].get("production_script") != script_ref
            ):
                return _error(409, "conflict", "脚本在动画提交期间已更新，请基于新版本重新提交。")
        except ProjectNotFoundError:
            return _error(404, "invalid_input", "没有找到这个创作项目。")
        except WorkflowArtifactNotFound:
            return _error(409, "conflict", "当前脚本或知识包版本不存在，请刷新项目状态。")
        except AnimationManifestConflict:
            return _error(409, "conflict", "动画产物引用的脚本版本已过期，或该版本 ID 已使用。")
        except AnimationManifestError:
            return _error(422, "invalid_input", "动画产物与当前脚本不匹配，或本地资源尚未就绪。")
        except (ProjectStateError, WorkflowError, ValueError):
            return _error(409, "conflict", "当前项目尚未准备好接收动画产物。")
        return {
            "status": "validated_pending_runtime",
            "artifact_ref": {
                "artifact_id": manifest["artifact_id"],
                "revision": manifest["revision"],
            },
            "message": "动画产物结构与本地资源引用已核对；通用播放器尚未接入，因此未发布到项目当前成果，也不能进入预览。",
        }

    app.state.connection_test = connection_test
    return app


app = create_app()
