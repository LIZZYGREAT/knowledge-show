import asyncio
import copy
import json
from pathlib import Path

import pytest

from script.artifacts import export_production_script
from script.llm import ScriptOutputError
from script.service import ScriptGenerationError, generate_production_script
from script.validate import ScriptValidationError, validate_production_script


ROOT = Path(__file__).resolve().parents[3]


def _example(name):
    return json.loads(
        (ROOT / "contracts" / "examples" / f"{name}.example.json").read_text(
            encoding="utf-8"
        )
    )


def _inputs():
    state = _example("project-state")
    package = _example("knowledge-package")
    return state, package


class FakeLLM:
    def __init__(self, *outputs):
        self.outputs = [copy.deepcopy(value) for value in outputs]
        self.calls = []

    async def generate_json(self, **kwargs):
        self.calls.append(kwargs)
        if not self.outputs:
            raise AssertionError("unexpected model call")
        value = copy.deepcopy(self.outputs.pop(0))
        if isinstance(value, Exception):
            raise value
        return value


def test_fixed_contract_examples_generate_and_reuse_an_immutable_script(tmp_path):
    state, package = _inputs()
    generated = _example("production-script")
    fake = FakeLLM(generated, generated)
    events = []

    first = asyncio.run(
        generate_production_script(
            state,
            package,
            llm_client=fake,
            on_event=events.append,
            export_dir=tmp_path,
        )
    )
    second = asyncio.run(
        generate_production_script(
            state, package, llm_client=fake, export_dir=tmp_path
        )
    )

    assert first == second
    assert first["artifact_id"].startswith("PS_P001_")
    assert first["revision"] == 1
    assert first["knowledge_package_ref"] == state["artifacts"]["knowledge_package"]
    assert first["direction_id"] == state["decisions"]["direction_id"]
    assert fake.calls[0]["max_output_tokens"] >= 10000
    assert len(fake.calls) == 2
    assert [event["event_type"] for event in events] == ["started", "completed"]
    assert json.loads(
        (tmp_path / f"{first['artifact_id']}-r1.json").read_text(encoding="utf-8")
    ) == first
    assert not list(tmp_path.glob("*.tmp"))


def test_source_version_change_creates_a_new_script_revision(tmp_path):
    state, package = _inputs()
    fake = FakeLLM(_example("production-script"), _example("production-script"))

    first = asyncio.run(
        generate_production_script(
            state, package, llm_client=fake, export_dir=tmp_path
        )
    )
    package["revision"] = 2
    state["artifacts"]["knowledge_package"]["revision"] = 2
    second = asyncio.run(
        generate_production_script(
            state, package, llm_client=fake, export_dir=tmp_path
        )
    )

    assert first["revision"] == 1
    assert second["revision"] == 2
    assert second["knowledge_package_ref"]["revision"] == 2


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda script: script["scenes"][0]["knowledge_refs"].append("K06"), "outside the selected direction"),
        (lambda script: script["scenes"][0]["timed_text"].append({"id": "T03", "offset_ms": 1000, "duration_ms": 1000, "text": "重叠字幕"}), "overlaps subtitle"),
        (
            lambda script: script["scenes"][1].update(start_ms=31_000),
            "continuous",
        ),
        (lambda script: script["scenes"][0]["events"][0].update(offset_ms=30_000), "begin inside scene"),
        (lambda script: script["scenes"][0]["events"][0].update(anchor="yes"), "boolean"),
    ],
)
def test_invalid_cross_layer_or_timing_data_is_rejected(mutate, message):
    state, package = _inputs()
    script = _example("production-script")
    mutate(script)

    with pytest.raises(ScriptValidationError, match=message):
        validate_production_script(script, state, package)


def test_invalid_script_gets_one_repair_and_is_not_published(tmp_path):
    state, package = _inputs()
    invalid = _example("production-script")
    invalid["scenes"][0]["knowledge_refs"].append("K06")
    fake = FakeLLM(invalid, invalid)

    events = []
    with pytest.raises(ScriptGenerationError, match="after one repair"):
        asyncio.run(
            generate_production_script(
                state,
                package,
                llm_client=fake,
                on_event=events.append,
                export_dir=tmp_path,
            )
        )

    assert len(fake.calls) == 2
    assert [event["event_type"] for event in events] == ["started", "failed"]
    assert events[-1]["stats"]["model_calls"] == 2
    assert list(tmp_path.iterdir()) == []


def test_invalid_json_repair_is_the_only_repair_attempt(tmp_path):
    state, package = _inputs()
    invalid = _example("production-script")
    invalid["scenes"][0]["knowledge_refs"].append("K06")
    fake = FakeLLM(
        ScriptOutputError("invalid JSON", raw_output="{"),
        invalid,
    )
    events = []

    with pytest.raises(ScriptGenerationError, match="after one repair"):
        asyncio.run(
            generate_production_script(
                state,
                package,
                llm_client=fake,
                on_event=events.append,
                export_dir=tmp_path,
            )
        )

    assert len(fake.calls) == 2
    assert events[-1]["stats"]["model_calls"] == 2
    assert list(tmp_path.iterdir()) == []


def test_published_revision_cannot_be_overwritten(tmp_path):
    state, package = _inputs()
    script = _example("production-script")
    path = tmp_path / f"{script['artifact_id']}-r{script['revision']}.json"
    path.write_text(json.dumps(script, ensure_ascii=False), encoding="utf-8")
    changed = copy.deepcopy(script)
    changed["core_message"] = "不同的核心信息"

    with pytest.raises(FileExistsError, match="different content"):
        export_production_script(
            changed,
            tmp_path,
            project_state=state,
            knowledge_package=package,
        )

    assert json.loads(path.read_text(encoding="utf-8")) == script
