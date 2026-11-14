import asyncio
import copy
import json
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

import api.app as api_module
import api.task_runner as task_runner_module
from knowledge.package import validate_knowledge_package
from knowledge.service import export_knowledge_package
from script.validate import validate_production_script
from workflow.jobs import JobStore
from workflow.animation import AnimationManifestCandidateStore
from workflow.revisions import RevisionRequestStore
from workflow.state import ProjectStateStore


ROOT = Path(__file__).resolve().parents[3]


def _example(name):
    return json.loads(
        (ROOT / "contracts" / "examples" / f"{name}.example.json").read_text(
            encoding="utf-8"
        )
    )


class FakeServices:
    def __init__(self, api_key):
        self.api_key = api_key
        self.closed = False

    def workflow_options(
        self,
        *,
        regenerate=False,
        knowledge_export_dir=None,
        script_export_dir=None,
    ):
        return {"regenerate": regenerate}

    async def close(self):
        self.closed = True


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def local_api(tmp_path, monkeypatch):
    projects = ProjectStateStore(tmp_path / "projects")
    jobs = JobStore(tmp_path / "jobs")
    created_services = []
    tested_keys = []

    def services_factory(api_key):
        service = FakeServices(api_key)
        created_services.append(service)
        return service

    async def connection_test(api_key):
        tested_keys.append(api_key)
        return True

    async def fake_run(project_id, *, options, state_store, on_event):
        project = state_store.load(project_id)
        project = state_store.publish_artifact_ref(
            project_id,
            project["revision"],
            "knowledge_package",
            {"artifact_id": f"KP_{project_id}", "revision": 1},
        )
        project = state_store.publish_artifact_ref(
            project_id,
            project["revision"],
            "production_script",
            {"artifact_id": f"PS_{project_id}", "revision": 1},
        )
        await on_event(
            {
                "stage": "knowledge",
                "kind": "completed",
                "artifact": project["artifacts"]["knowledge_package"],
                "diagnostic": {"summary": "should never persist"},
            }
        )
        await on_event(
            {
                "stage": "script",
                "kind": "completed",
                "artifact": project["artifacts"]["production_script"],
            }
        )
        return {"project": project}

    monkeypatch.setattr(task_runner_module, "run_until_script", fake_run)
    app = api_module.create_app(
        state_store=projects,
        job_store=jobs,
        knowledge_export_dir=tmp_path / "knowledge",
        script_export_dir=tmp_path / "scripts",
        services_factory=services_factory,
        connection_test=connection_test,
    )
    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        ) as client:
            yield client, projects, jobs, created_services, tested_keys


@pytest.mark.anyio
async def test_health_create_project_and_safe_connection_test(local_api):
    client, _, _, _, tested_keys = local_api
    assert (await client.get("/api/health")).json() == {"status": "ok"}
    response = await client.post(
        "/api/projects",
        json={"user_input": {"topic": "为什么天空是蓝色的？"}},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["project"]["brief"]["user_input"]["topic"] == "为什么天空是蓝色的？"
    assert body["project_revision"] == 1

    tested = await client.post("/api/model/test", json={"api_key": "sk-test-secret"})
    assert tested.status_code == 200
    assert tested.json() == {"connected": True}
    assert tested_keys == ["sk-test-secret"]
    assert "sk-test-secret" not in tested.text


@pytest.mark.anyio
async def test_job_snapshot_persists_safe_progress_and_closes_request_clients(local_api):
    client, projects, jobs, created_services, _ = local_api
    project_response = await client.post(
        "/api/projects", json={"user_input": {"topic": "骰子概率"}}
    )
    project = project_response.json()["project"]
    secret = "sk-job-secret-do-not-persist"
    started = await client.post(
        f"/api/projects/{project['project_id']}/jobs",
        json={"target": "script", "api_key": secret},
    )
    assert started.status_code == 202
    job_id = started.json()["job_id"]

    for _ in range(50):
        snapshot = (await client.get(f"/api/jobs/{job_id}")).json()
        if snapshot["status"] != "running":
            break
        await asyncio.sleep(0.01)

    assert snapshot["status"] == "script_ready"
    assert snapshot["stages"] == {
        "knowledge": "completed",
        "script": "completed",
        "animation": "pending",
    }
    assert snapshot["message"] == "脚本准备完成，等待动画制作。"
    assert snapshot["artifacts"]["production_script"]["revision"] == 1
    persisted = jobs._path(job_id).read_text(encoding="utf-8")
    assert secret not in persisted
    assert "diagnostic" not in persisted
    assert created_services[0].api_key == secret
    assert created_services[0].closed
    assert projects.load(project["project_id"])["artifacts"]["production_script"] == {
        "artifact_id": f"PS_{project['project_id']}",
        "revision": 1,
    }


@pytest.mark.anyio
async def test_invalid_requests_and_connection_failures_do_not_echo_details(local_api):
    client, _, _, _, _ = local_api
    invalid = await client.post("/api/projects", json={"user_input": {"topic": " "}})
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "invalid_input"
    missing_key = await client.post("/api/model/test", json={})
    assert missing_key.status_code == 422
    assert missing_key.json()["error"]["code"] == "missing_key"

    async def rejected(_):
        raise RuntimeError("DeepSeek rejected the API key sk-private-detail")

    # Exercise a separate app so this change remains isolated to the test callback.
    app = api_module.create_app(connection_test=rejected)
    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        ) as rejecting_client:
            response = await rejecting_client.post(
                "/api/model/test", json={"api_key": "sk-private-detail"}
            )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_key"
    assert "sk-private-detail" not in response.text
    assert "DeepSeek rejected" not in response.text


@pytest.mark.anyio
async def test_api_restart_marks_unfinished_jobs_interrupted(tmp_path):
    projects = ProjectStateStore(tmp_path / "projects")
    jobs = JobStore(tmp_path / "jobs")
    project = projects.create({"topic": "行星为什么会保持轨道？"})
    job = jobs.create(project["project_id"], project["revision"])
    jobs.update(
        job["job_id"],
        status="running",
        current_stage="script",
        stages={"knowledge": "completed", "script": "running", "animation": "pending"},
    )

    app = api_module.create_app(state_store=projects, job_store=jobs)
    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        ) as client:
            recovered = (await client.get(f"/api/jobs/{job['job_id']}")).json()

    assert recovered["status"] == "interrupted"
    assert recovered["stages"]["knowledge"] == "completed"
    assert recovered["stages"]["script"] == "failed"
    assert "停止" in recovered["message"]


@pytest.mark.anyio
async def test_animation_handoff_returns_current_exact_script_without_claiming_video(
    tmp_path,
):
    projects = ProjectStateStore(tmp_path / "projects")
    knowledge_exports = tmp_path / "knowledge"
    script_exports = tmp_path / "scripts"
    project = projects.create({"topic": "为什么两枚骰子的点数和为 7 最常见？"})
    package = _example("knowledge-package")
    package["project_id"] = project["project_id"]
    package["artifact_id"] = f"KP_{project['project_id']}"
    package["brief_revision"] = project["brief"]["revision"]
    validate_knowledge_package(package)
    export_knowledge_package(package, knowledge_exports)
    project = projects.publish_artifact_ref(
        project["project_id"],
        project["revision"],
        "knowledge_package",
        {"artifact_id": package["artifact_id"], "revision": package["revision"]},
    )
    direction_id = package["recommended_direction_id"]
    project = projects.update(
        project["project_id"],
        project["revision"],
        decisions={"direction_id": direction_id, "direction_status": "system_default"},
    )
    script = _example("production-script")
    script.update(
        project_id=project["project_id"],
        artifact_id=f"PS_{project['project_id']}",
        revision=1,
        brief_revision=project["brief"]["revision"],
        knowledge_package_ref={
            "artifact_id": package["artifact_id"],
            "revision": package["revision"],
        },
        direction_id=direction_id,
    )
    validate_production_script(script, project, package)
    script_exports.mkdir(parents=True, exist_ok=True)
    (script_exports / f"{script['artifact_id']}-r1.json").write_text(
        json.dumps(script, ensure_ascii=False), encoding="utf-8"
    )
    project = projects.publish_artifact_ref(
        project["project_id"],
        project["revision"],
        "production_script",
        {"artifact_id": script["artifact_id"], "revision": 1},
    )
    media_root = tmp_path / "media"
    media_root.mkdir()
    (media_root / "preview.mock").write_text("mock preview resource", encoding="utf-8")
    clips = []
    for index, scene in enumerate(script["scenes"], start=1):
        resource_ref = f"scene-{index}.mock"
        (media_root / resource_ref).write_text("mock scene resource", encoding="utf-8")
        clips.append(
            {
                "clip_id": f"CLIP{index:02d}",
                "scene_id": scene["scene_id"],
                "start_ms": scene["start_ms"],
                "duration_ms": scene["duration_ms"],
                "resource_ref": resource_ref,
                "script_event_refs": [event["id"] for event in scene["events"]],
            }
        )
    manifest = {
        "project_id": project["project_id"],
        "artifact_id": f"AM_{project['project_id']}",
        "revision": 1,
        "brief_revision": project["brief"]["revision"],
        "production_script_ref": {"artifact_id": script["artifact_id"], "revision": 1},
        "total_duration_ms": script["total_duration_ms"],
        "preview_ref": "preview.mock",
        "clips": clips,
    }
    manifest_store = AnimationManifestCandidateStore(
        tmp_path / "manifest-candidates", resource_root=media_root
    )
    app = api_module.create_app(
        state_store=projects,
        job_store=JobStore(tmp_path / "jobs"),
        knowledge_export_dir=knowledge_exports,
        script_export_dir=script_exports,
        animation_manifest_store=manifest_store,
    )

    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        ) as client:
            handoff = await client.get(
                f"/api/projects/{project['project_id']}/handoff/animation"
            )
            exact_script = await client.get(
                f"/api/projects/{project['project_id']}/production-script",
                params={"artifact_id": script["artifact_id"], "revision": 1},
            )
            candidate = await client.post(
                f"/api/projects/{project['project_id']}/animation-manifest",
                json=manifest,
            )
            stale_manifest = copy.deepcopy(manifest)
            stale_manifest["artifact_id"] = f"AM_STALE_{project['project_id']}"
            stale_manifest["production_script_ref"]["revision"] = 2
            stale = await client.post(
                f"/api/projects/{project['project_id']}/animation-manifest",
                json=stale_manifest,
            )
            unsafe_manifest = copy.deepcopy(manifest)
            unsafe_manifest["artifact_id"] = f"AM_UNSAFE_{project['project_id']}"
            unsafe_manifest["preview_ref"] = "../outside.mock"
            unsafe = await client.post(
                f"/api/projects/{project['project_id']}/animation-manifest",
                json=unsafe_manifest,
            )
            preview = await client.get(
                f"/api/projects/{project['project_id']}/preview"
            )
            changed_direction = await client.post(
                f"/api/projects/{project['project_id']}/direction",
                json={
                    "direction_id": package["directions"][1]["id"],
                    "expected_project_revision": project["revision"],
                },
            )
            stale_direction = await client.post(
                f"/api/projects/{project['project_id']}/direction",
                json={
                    "direction_id": direction_id,
                    "expected_project_revision": project["revision"],
                },
            )

    assert handoff.status_code == 200
    assert handoff.json()["status"] == "awaiting_animation"
    assert handoff.json()["production_script_ref"] == {
        "artifact_id": script["artifact_id"],
        "revision": 1,
    }
    assert handoff.json()["production_script"] == script
    assert exact_script.status_code == 200
    assert exact_script.json() == script
    assert candidate.status_code == 202
    assert candidate.json()["status"] == "validated_pending_runtime"
    assert "未发布到项目当前成果" in candidate.json()["message"]
    assert stale.status_code == 409
    assert unsafe.status_code == 422
    assert preview.json()["status"] == "not_ready"
    assert "播放器尚未接入" in preview.json()["message"]
    assert "animation_manifest" not in projects.load(project["project_id"])["artifacts"]
    assert changed_direction.status_code == 200
    assert changed_direction.json()["decisions"] == {
        "direction_id": package["directions"][1]["id"],
        "direction_status": "user_confirmed",
    }
    assert "production_script" not in changed_direction.json()["artifacts"]
    assert stale_direction.status_code == 409


@pytest.mark.anyio
async def test_revision_request_is_validated_persisted_and_never_claims_execution(
    tmp_path,
):
    projects = ProjectStateStore(tmp_path / "projects")
    revisions = RevisionRequestStore(tmp_path / "revision-requests")
    project = projects.create({"topic": "生日悖论"})
    request = {
        "project_id": project["project_id"],
        "request_id": "RR_E2E_001",
        "base_project_revision": project["revision"],
        "source": "user",
        "target_layer": "unresolved",
        "target_artifact": {
            "kind": "project_state",
            "artifact_id": project["project_id"],
            "revision": project["revision"],
        },
        "anchors": [],
        "scope": "unknown",
        "problem": "开场没有说明为什么 23 人是关键数字。",
        "original_user_feedback": "请补充直觉上的反差。",
    }
    app = api_module.create_app(
        state_store=projects,
        job_store=JobStore(tmp_path / "jobs"),
        revision_store=revisions,
    )

    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        ) as client:
            accepted = await client.post(
                f"/api/projects/{project['project_id']}/revision-requests",
                json=request,
            )
            preview = await client.get(f"/api/projects/{project['project_id']}/preview")

    assert accepted.status_code == 202
    assert accepted.json()["status"] == "received"
    assert "暂不支持自动修改" in accepted.json()["message"]
    assert revisions.root_dir.joinpath(project["project_id"], "RR_E2E_001.json").exists()
    assert projects.load(project["project_id"]) == project
    assert preview.status_code == 200
    assert preview.json()["status"] == "not_ready"
    assert "尚无" in preview.json()["message"]
