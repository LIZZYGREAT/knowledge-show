import asyncio
import copy
import json
from pathlib import Path

import pytest

from knowledge.package import validate_knowledge_package
from knowledge.service import RunOptions, export_knowledge_package
from script.llm import ScriptOutputError
from script.service import ScriptGenerationError
from workflow.service import WorkflowOptions, read_production_script, run_until_script
from workflow.state import ProjectStateConflict, ProjectStateStore


ROOT = Path(__file__).resolve().parents[3]


def _example(name):
    return json.loads(
        (ROOT / "contracts" / "examples" / f"{name}.example.json").read_text(
            encoding="utf-8"
        )
    )


class FixtureScriptClient:
    def __init__(self, *values):
        self.values = [copy.deepcopy(value) for value in values]
        self.calls = 0

    async def generate_json(self, **kwargs):
        self.calls += 1
        value = self.values.pop(0)
        if isinstance(value, Exception):
            raise value
        return copy.deepcopy(value)


class DelayedFixtureScriptClient(FixtureScriptClient):
    async def generate_json(self, **kwargs):
        await asyncio.sleep(0)
        return await super().generate_json(**kwargs)


def _mock_package(project_id, brief):
    package = _example("knowledge-package")
    package["project_id"] = project_id
    package["artifact_id"] = f"KP_{project_id}"
    package["brief_revision"] = brief["revision"]
    validate_knowledge_package(package)
    return package


def test_project_state_revisions_are_immutable_and_optimistic(tmp_path):
    store = ProjectStateStore(tmp_path / "projects")
    project = store.create({"topic": "为什么两枚骰子的点数和为 7 最常见？"})
    initial_path = tmp_path / "projects" / project["project_id"] / "project-r1.json"
    original = initial_path.read_bytes()

    updated = store.update(
        project["project_id"],
        1,
        decisions={"direction_id": "D01", "direction_status": "system_default"},
    )

    assert updated["revision"] == 2
    assert store.load(project["project_id"]) == updated
    assert initial_path.read_bytes() == original
    with pytest.raises(ProjectStateConflict):
        store.update(project["project_id"], 1, decisions={})
    assert store.load_revision(project["project_id"], 1) == project


def test_workflow_publishes_knowledge_then_script_and_sets_default_direction(
    tmp_path, monkeypatch
):
    projects = tmp_path / "projects"
    knowledge_exports = tmp_path / "knowledge"
    script_exports = tmp_path / "scripts"
    store = ProjectStateStore(projects)
    project = store.create({"topic": "为什么两枚骰子的点数和为 7 最常见？"})
    calls = []

    async def mock_knowledge(project_id, brief, *, run_options, on_event):
        calls.append(project_id)
        package = _mock_package(project_id, brief)
        export_knowledge_package(package, run_options.export_dir)
        await on_event(
            {
                "phase": "delivery",
                "event_type": "completed",
                "summary": "private knowledge diagnostics",
                "stats": {"model_calls": 0},
            }
        )
        return package

    monkeypatch.setattr("workflow.service.generate_knowledge_package", mock_knowledge)
    script_client = FixtureScriptClient(_example("production-script"))
    events = []
    result = asyncio.run(
        run_until_script(
            project["project_id"],
            options=WorkflowOptions(
                mode="mock",
                knowledge_options=RunOptions(mode="mock"),
                script_client=script_client,
                knowledge_export_dir=knowledge_exports,
                script_export_dir=script_exports,
            ),
            state_store=store,
            on_event=events.append,
        )
    )

    final = result["project"]
    assert final["revision"] == 4
    assert final["decisions"] == {
        "direction_id": "D01",
        "direction_status": "system_default",
    }
    assert final["artifacts"]["knowledge_package"] == {
        "artifact_id": f"KP_{project['project_id']}",
        "revision": 1,
    }
    assert final["artifacts"]["production_script"] == {
        "artifact_id": result["production_script"]["artifact_id"],
        "revision": 1,
    }
    assert "animation_manifest" not in final["artifacts"]
    assert calls == [project["project_id"]]
    assert [event["kind"] for event in events if "kind" in event] == [
        "completed",
        "started",
        "completed",
    ]
    assert events[-1]["stage"] == "script"
    exact_script = read_production_script(
        project["project_id"],
        final["artifacts"]["production_script"],
        project=final,
        package=result["knowledge_package"],
        export_dir=script_exports,
    )
    assert exact_script == result["production_script"]

    reused = asyncio.run(
        run_until_script(
            project["project_id"],
            options=WorkflowOptions(
                mode="mock",
                script_client=script_client,
                knowledge_export_dir=knowledge_exports,
                script_export_dir=script_exports,
            ),
            state_store=store,
        )
    )
    assert reused["production_script"] == result["production_script"]
    assert reused["project"] == final
    assert script_client.calls == 1


def test_project_state_invalidates_only_changed_downstream_references(tmp_path):
    store = ProjectStateStore(tmp_path / "projects")
    project = store.create({"topic": "为什么两枚骰子的点数和为 7 最常见？"})
    project = store.update(
        project["project_id"],
        project["revision"],
        decisions={"direction_id": "D01", "direction_status": "system_default"},
        artifacts={"knowledge_package": {"artifact_id": "KP_A", "revision": 1}},
    )
    project = store.update(
        project["project_id"],
        project["revision"],
        artifacts={
            **project["artifacts"],
            "production_script": {"artifact_id": "PS_A", "revision": 1},
            "animation_manifest": {"artifact_id": "AM_A", "revision": 1},
        },
    )

    unchanged = store.publish_artifact_ref(
        project["project_id"],
        project["revision"],
        "knowledge_package",
        {"artifact_id": "KP_A", "revision": 1},
    )
    assert unchanged["artifacts"]["production_script"] == {
        "artifact_id": "PS_A",
        "revision": 1,
    }

    changed_knowledge = store.publish_artifact_ref(
        project["project_id"],
        unchanged["revision"],
        "knowledge_package",
        {"artifact_id": "KP_A", "revision": 2},
    )
    assert changed_knowledge["artifacts"] == {
        "knowledge_package": {"artifact_id": "KP_A", "revision": 2}
    }

    with_script = store.update(
        project["project_id"],
        changed_knowledge["revision"],
        artifacts={
            **changed_knowledge["artifacts"],
            "production_script": {"artifact_id": "PS_A", "revision": 2},
            "animation_manifest": {"artifact_id": "AM_A", "revision": 1},
        },
    )
    changed_script = store.publish_artifact_ref(
        project["project_id"],
        with_script["revision"],
        "production_script",
        {"artifact_id": "PS_A", "revision": 3},
    )
    assert changed_script["artifacts"] == {
        "knowledge_package": {"artifact_id": "KP_A", "revision": 2},
        "production_script": {"artifact_id": "PS_A", "revision": 3},
    }

    with_animation = store.update(
        project["project_id"],
        changed_script["revision"],
        artifacts={
            **changed_script["artifacts"],
            "animation_manifest": {"artifact_id": "AM_A", "revision": 1},
        },
    )
    changed_direction = store.update(
        project["project_id"],
        with_animation["revision"],
        decisions={"direction_id": "D02", "direction_status": "user_confirmed"},
    )
    assert changed_direction["artifacts"] == {
        "knowledge_package": {"artifact_id": "KP_A", "revision": 2}
    }


def test_concurrent_workflow_requests_for_one_project_are_serialized(
    tmp_path, monkeypatch
):
    store = ProjectStateStore(tmp_path / "projects")
    project = store.create({"topic": "为什么两枚骰子的点数和为 7 最常见？"})
    knowledge_exports = tmp_path / "knowledge"
    script_exports = tmp_path / "scripts"
    knowledge_calls = []

    async def mock_knowledge(project_id, brief, *, run_options, on_event):
        knowledge_calls.append(project_id)
        await asyncio.sleep(0)
        package = _mock_package(project_id, brief)
        export_knowledge_package(package, run_options.export_dir)
        await on_event({"phase": "delivery", "event_type": "completed"})
        return package

    monkeypatch.setattr("workflow.service.generate_knowledge_package", mock_knowledge)
    script_client = DelayedFixtureScriptClient(_example("production-script"))
    options = WorkflowOptions(
        mode="mock",
        knowledge_options=RunOptions(mode="mock"),
        script_client=script_client,
        knowledge_export_dir=knowledge_exports,
        script_export_dir=script_exports,
    )

    async def run_twice():
        return await asyncio.gather(
            run_until_script(project["project_id"], options=options, state_store=store),
            run_until_script(project["project_id"], options=options, state_store=store),
        )

    first, second = asyncio.run(run_twice())
    assert knowledge_calls == [project["project_id"]]
    assert script_client.calls == 1
    assert first["production_script"] == second["production_script"]


def test_failed_script_retry_reuses_published_knowledge_package(tmp_path, monkeypatch):
    store = ProjectStateStore(tmp_path / "projects")
    project = store.create({"topic": "为什么两枚骰子的点数和为 7 最常见？"})
    knowledge_exports = tmp_path / "knowledge"
    script_exports = tmp_path / "scripts"
    knowledge_calls = []

    async def mock_knowledge(project_id, brief, *, run_options, on_event):
        knowledge_calls.append(project_id)
        package = _mock_package(project_id, brief)
        export_knowledge_package(package, run_options.export_dir)
        await on_event({"phase": "delivery", "event_type": "completed"})
        return package

    monkeypatch.setattr("workflow.service.generate_knowledge_package", mock_knowledge)
    invalid = _example("production-script")
    invalid["scenes"][0]["knowledge_refs"].append("K06")
    first_script = FixtureScriptClient(invalid, invalid)
    options = WorkflowOptions(
        mode="mock",
        knowledge_options=RunOptions(mode="mock"),
        script_client=first_script,
        knowledge_export_dir=knowledge_exports,
        script_export_dir=script_exports,
    )

    with pytest.raises(ScriptGenerationError):
        asyncio.run(run_until_script(project["project_id"], options=options, state_store=store))

    state_after_failure = store.load(project["project_id"])
    assert "knowledge_package" in state_after_failure["artifacts"]
    assert "production_script" not in state_after_failure["artifacts"]
    retry = FixtureScriptClient(_example("production-script"))
    options.script_client = retry
    result = asyncio.run(
        run_until_script(project["project_id"], options=options, state_store=store)
    )

    assert knowledge_calls == [project["project_id"]]
    assert retry.calls == 1
    assert result["project"]["artifacts"]["knowledge_package"] == state_after_failure[
        "artifacts"
    ]["knowledge_package"]
