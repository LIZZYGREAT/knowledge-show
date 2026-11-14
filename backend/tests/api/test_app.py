import asyncio
import copy
import json
import logging
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
async def test_failed_job_logs_safe_stage_diagnostics_without_private_error_details(
    tmp_path, monkeypatch, caplog
):
    projects = ProjectStateStore(tmp_path / "projects")
    jobs = JobStore(tmp_path / "jobs")
    secret = "sk-private-failure-secret"
    raw_detail = f"provider response leaked {secret}; private traceback follows"

    async def failing_run(_project_id, *, options, state_store, on_event):
        await on_event({"stage": "script", "kind": "running"})
        raise RuntimeError(raw_detail)

    monkeypatch.setattr(task_runner_module, "run_until_script", failing_run)
    app = api_module.create_app(
        state_store=projects,
        job_store=jobs,
        services_factory=FakeServices,
        connection_test=lambda _: True,
    )
    caplog.set_level(logging.ERROR, logger="api.task_runner")

    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        ) as client:
            created = await client.post(
                "/api/projects", json={"user_input": {"topic": "生日悖论"}}
            )
            project_id = created.json()["project_id"]
            started = await client.post(
                f"/api/projects/{project_id}/jobs",
                json={"target": "script", "api_key": secret},
            )
            job_id = started.json()["job_id"]
            for _ in range(50):
                response = await client.get(f"/api/jobs/{job_id}")
                snapshot = response.json()
                if snapshot["status"] != "running":
                    break
                await asyncio.sleep(0.01)

    assert response.status_code == 200
    assert snapshot["status"] == "failed"
    assert snapshot["error_code"] == "temporarily_unavailable"
    assert secret not in response.text
    assert raw_detail not in response.text
    assert "traceback" not in response.text.lower()
    assert secret not in jobs._path(job_id).read_text(encoding="utf-8")

    diagnostic_records = [
        record for record in caplog.records if "Local generation job failed" in record.message
    ]
    assert len(diagnostic_records) == 1
    diagnostic = diagnostic_records[0]
    assert job_id in diagnostic.message
    assert "stage=script" in diagnostic.message
    assert "error_code=temporarily_unavailable" in diagnostic.message
    assert "exception_type=RuntimeError" in diagnostic.message
    assert secret not in diagnostic.message
    assert raw_detail not in diagnostic.message
    assert diagnostic.exc_info is None


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
                "internal_events": [
                    {
                        "id": f"ANIM_{event['id']}",
                        "offset_ms": event["offset_ms"],
                        "duration_ms": 1000,
                        "description": "映射脚本锚点",
                        "script_event_refs": [event["id"]],
                    }
                    for event in scene["events"]
                    if event.get("anchor") is True
                ],
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
            wrong_text_id = copy.deepcopy(manifest)
            wrong_text_id["artifact_id"] = f"AM_TEXT_ID_{project['project_id']}"
            wrong_text_id["selectable_elements"] = [
                {
                    "id": "EL_WRONG_TEXT_ID",
                    "source_ref": {
                        "kind": "timed_text",
                        "id": script["scenes"][0]["timed_text"][0]["id"],
                    },
                }
            ]
            wrong_text = await client.post(
                f"/api/projects/{project['project_id']}/animation-manifest",
                json=wrong_text_id,
            )
            missing_anchor = copy.deepcopy(manifest)
            missing_anchor["artifact_id"] = f"AM_NO_ANCHOR_{project['project_id']}"
            missing_anchor["clips"][-1]["internal_events"][0]["script_event_refs"] = []
            no_anchor = await client.post(
                f"/api/projects/{project['project_id']}/animation-manifest",
                json=missing_anchor,
            )
            out_of_order = copy.deepcopy(manifest)
            out_of_order["artifact_id"] = f"AM_ORDER_{project['project_id']}"
            out_of_order["clips"] = list(reversed(out_of_order["clips"]))
            unordered = await client.post(
                f"/api/projects/{project['project_id']}/animation-manifest",
                json=out_of_order,
            )
            duplicate_clip = copy.deepcopy(manifest)
            duplicate_clip["artifact_id"] = f"AM_DUP_CLIP_{project['project_id']}"
            duplicate_clip["clips"][1]["clip_id"] = duplicate_clip["clips"][0]["clip_id"]
            duplicate_clip_response = await client.post(
                f"/api/projects/{project['project_id']}/animation-manifest",
                json=duplicate_clip,
            )
            duplicate_internal = copy.deepcopy(manifest)
            duplicate_internal["artifact_id"] = f"AM_DUP_EVENT_{project['project_id']}"
            duplicate_internal["clips"][-1]["internal_events"].append(
                copy.deepcopy(duplicate_internal["clips"][-1]["internal_events"][0])
            )
            duplicate_event_response = await client.post(
                f"/api/projects/{project['project_id']}/animation-manifest",
                json=duplicate_internal,
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
            preview_without_script = await client.get(
                f"/api/projects/{project['project_id']}/preview"
            )
            changed_project = projects.load(project["project_id"])
            with_new_script = projects.publish_artifact_ref(
                changed_project["project_id"],
                changed_project["revision"],
                "production_script",
                {"artifact_id": f"PS_NEW_{project['project_id']}", "revision": 1},
            )
            preview_with_new_script = await client.get(
                f"/api/projects/{project['project_id']}/preview"
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
    assert wrong_text.status_code == 422
    assert no_anchor.status_code == 422
    assert unordered.status_code == 422
    assert duplicate_clip_response.status_code == 422
    assert duplicate_event_response.status_code == 422
    assert preview.json()["status"] == "not_ready"
    assert "播放器尚未接入" in preview.json()["message"]
    assert "production_script" in project["artifacts"]
    assert "animation_manifest" not in projects.load(project["project_id"])["artifacts"]
    assert changed_direction.status_code == 200
    assert changed_direction.json()["decisions"] == {
        "direction_id": package["directions"][1]["id"],
        "direction_status": "user_confirmed",
    }
    assert "production_script" not in changed_direction.json()["artifacts"]
    assert preview_without_script.json()["status"] == "not_ready"
    assert "等待中" in preview_without_script.json()["message"]
    candidate_path = (
        manifest_store.root_dir
        / project["project_id"]
        / f"{manifest['artifact_id']}-r{manifest['revision']}.json"
    )
    assert candidate_path.exists()
    assert preview_with_new_script.json()["status"] == "not_ready"
    assert "尚无匹配" in preview_with_new_script.json()["message"]
    assert not manifest_store.has_current_candidate(with_new_script)
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
    assert "等待中" in preview.json()["message"]


def _anchored_revision_request(project, *, request_id, target_kind, anchors):
    target = (
        {
            "artifact_id": project["project_id"],
            "revision": project["revision"],
        }
        if target_kind == "project_state"
        else project["artifacts"][target_kind]
    )
    return {
        "project_id": project["project_id"],
        "request_id": request_id,
        "base_project_revision": project["revision"],
        "source": "user",
        "target_layer": "animation" if target_kind == "animation_manifest" else "script",
        "target_artifact": {"kind": target_kind, **target},
        "anchors": anchors,
        "scope": "local",
        "problem": "请检查这个精确位置。",
    }


@pytest.mark.anyio
async def test_revision_anchors_resolve_against_exact_published_mock_artifacts(tmp_path):
    projects = ProjectStateStore(tmp_path / "projects")
    revisions = RevisionRequestStore(tmp_path / "revision-requests")
    project = projects.create({"topic": "生日悖论"})
    refs = {
        "knowledge_package": {"artifact_id": "KP_REVISION_TEST", "revision": 1},
        "production_script": {"artifact_id": "PS_REVISION_TEST", "revision": 1},
        "animation_manifest": {"artifact_id": "AM_REVISION_TEST", "revision": 1},
    }
    for kind, ref in refs.items():
        project = projects.publish_artifact_ref(
            project["project_id"], project["revision"], kind, ref
        )

    package = {
        **refs["knowledge_package"],
        "project_id": project["project_id"],
        "brief_revision": project["brief"]["revision"],
        "directions": [{"id": "DIR_REVISION_TEST"}],
        "knowledge_units": [{"id": "KU_REVISION_TEST"}],
    }
    script = {
        **refs["production_script"],
        "project_id": project["project_id"],
        "brief_revision": project["brief"]["revision"],
        "knowledge_package_ref": refs["knowledge_package"],
        "total_duration_ms": 30000,
        "scenes": [
            {
                "scene_id": "SC_REVISION_TEST",
                "events": [{"id": "EV_REVISION_TEST"}],
                "timed_text": [{"id": "TT_REVISION_TEST"}],
            }
        ],
    }
    manifest = {
        **refs["animation_manifest"],
        "project_id": project["project_id"],
        "brief_revision": project["brief"]["revision"],
        "production_script_ref": refs["production_script"],
        "total_duration_ms": 30000,
        "clips": [
            {
                "clip_id": "CL_REVISION_TEST",
                "internal_events": [{"id": "CE_REVISION_TEST"}],
            }
        ],
        "selectable_elements": [{"id": "RE_REVISION_TEST"}],
    }

    def resolve_exact_artifacts(_project, _target):
        return {
            "knowledge_package": package,
            "production_script": script,
            "animation_manifest": manifest,
        }

    app = api_module.create_app(
        state_store=projects,
        job_store=JobStore(tmp_path / "jobs"),
        revision_store=revisions,
        revision_artifact_resolver=resolve_exact_artifacts,
    )
    good_anchors = [
        {"kind": "render_element", "id": "RE_REVISION_TEST"},
        {"kind": "timed_text", "id": "TT_REVISION_TEST"},
        {"kind": "scene", "id": "SC_REVISION_TEST"},
        {"kind": "clip", "id": "CL_REVISION_TEST"},
        {"kind": "time_range", "start_ms": 1000, "end_ms": 2000},
    ]
    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        ) as client:
            accepted = await client.post(
                f"/api/projects/{project['project_id']}/revision-requests",
                json=_anchored_revision_request(
                    project,
                    request_id="RR_VALID_ANCHORS",
                    target_kind="animation_manifest",
                    anchors=good_anchors,
                ),
            )
            invalid_cases = [
                ("RR_BAD_ELEMENT", [{"kind": "render_element", "id": "RE_MISSING"}]),
                ("RR_BAD_TEXT", [{"kind": "timed_text", "id": "TT_MISSING"}]),
                ("RR_BAD_SCENE", [{"kind": "scene", "id": "SC_MISSING"}]),
                ("RR_BAD_CLIP", [{"kind": "clip", "id": "CL_MISSING"}]),
                ("RR_BAD_RANGE", [{"kind": "time_range", "start_ms": 0, "end_ms": 30001}]),
            ]
            rejected = []
            for request_id, anchors in invalid_cases:
                response = await client.post(
                    f"/api/projects/{project['project_id']}/revision-requests",
                    json=_anchored_revision_request(
                        project,
                        request_id=request_id,
                        target_kind="animation_manifest",
                        anchors=anchors,
                    ),
                )
                rejected.append((request_id, response))

            stale_target = _anchored_revision_request(
                project,
                request_id="RR_STALE_MANIFEST",
                target_kind="animation_manifest",
                anchors=[{"kind": "render_element", "id": "RE_REVISION_TEST"}],
            )
            stale_target["target_artifact"]["revision"] = 2
            stale = await client.post(
                f"/api/projects/{project['project_id']}/revision-requests",
                json=stale_target,
            )

    assert accepted.status_code == 202
    assert accepted.json()["status"] == "received"
    assert all(response.status_code == 422 for _, response in rejected)
    assert all(
        not revisions.root_dir.joinpath(project["project_id"], f"{request_id}.json").exists()
        for request_id, _ in rejected
    )
    assert stale.status_code == 409


@pytest.mark.anyio
async def test_revision_request_never_uses_animation_candidate_as_published_manifest(
    tmp_path,
):
    projects = ProjectStateStore(tmp_path / "projects")
    revisions = RevisionRequestStore(tmp_path / "revision-requests")
    candidates = AnimationManifestCandidateStore(tmp_path / "manifest-candidates")
    project = projects.create({"topic": "生日悖论"})
    project = projects.publish_artifact_ref(
        project["project_id"],
        project["revision"],
        "animation_manifest",
        {"artifact_id": "AM_CANDIDATE_ONLY", "revision": 1},
    )
    candidate_folder = candidates.root_dir / project["project_id"]
    candidate_folder.mkdir(parents=True)
    (candidate_folder / "AM_CANDIDATE_ONLY-r1.json").write_text(
        json.dumps({"selectable_elements": [{"id": "RE_CANDIDATE_ONLY"}]}),
        encoding="utf-8",
    )
    app = api_module.create_app(
        state_store=projects,
        job_store=JobStore(tmp_path / "jobs"),
        revision_store=revisions,
        animation_manifest_store=candidates,
    )

    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        ) as client:
            response = await client.post(
                f"/api/projects/{project['project_id']}/revision-requests",
                json=_anchored_revision_request(
                    project,
                    request_id="RR_CANDIDATE_ONLY",
                    target_kind="animation_manifest",
                    anchors=[{"kind": "render_element", "id": "RE_CANDIDATE_ONLY"}],
                ),
            )

    assert candidates.root_dir.joinpath(
        project["project_id"], "AM_CANDIDATE_ONLY-r1.json"
    ).exists()
    assert response.status_code == 422
    assert not revisions.root_dir.joinpath(
        project["project_id"], "RR_CANDIDATE_ONLY.json"
    ).exists()
