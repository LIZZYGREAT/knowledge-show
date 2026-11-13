import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest

from knowledge.brief import build_brief
from knowledge.mock_data import MockFixtureNotFound
from knowledge.package import validate_knowledge_package
from knowledge.service import RunOptions, generate_knowledge_package
from knowledge.store import ResearchStore


def test_mock_workflow_returns_valid_public_package_and_safe_events(tmp_path):
    events = []
    store = ResearchStore(tmp_path / "knowledge.sqlite3")
    brief = build_brief({"topic": "生日悖论", "focus": "为什么 23 人就超过一半"})
    package = asyncio.run(
        generate_knowledge_package(
            "P_TEST_KNOWLEDGE",
            brief,
            on_event=events.append,
            run_options=RunOptions(
                mode="mock", store=store, export_dir=str(tmp_path / "exports")
            ),
        )
    )

    validate_knowledge_package(package)
    assert package["project_id"] == "P_TEST_KNOWLEDGE"
    assert package["brief_revision"] == brief["revision"]
    assert package["directions"][0]["recommendation_reason"].endswith(
        "用户指定的关注方向为：为什么 23 人就超过一半。"
    )
    assert [event["phase"] for event in events][-1] == "delivery"
    assert all("chain_of_thought" not in event for event in events)
    run_id = events[0]["run_id"]
    stored_run = store.get_run("P_TEST_KNOWLEDGE", run_id)
    assert stored_run.status == "completed"
    assert stored_run.package_revision == package["revision"]
    assert store.get_package("P_TEST_KNOWLEDGE", package["artifact_id"]) == package
    assert len(store.list_run_events("P_TEST_KNOWLEDGE", run_id)) == len(events)
    assert (tmp_path / "exports" / f"{package['artifact_id']}-r1.json").is_file()
    assert (tmp_path / "exports" / f"{run_id}.json").is_file()
    store.save_review("P_TEST_KNOWLEDGE", run_id, "usable", "候选主线清晰")
    assert store.get_run("P_TEST_KNOWLEDGE", run_id).human_note == "候选主线清晰"


def test_mock_unknown_topic_fails_without_a_package_and_reports_failure(tmp_path):
    events = []
    store = ResearchStore(tmp_path / "knowledge.sqlite3")
    brief = build_brief({"topic": "随便一个未覆盖主题"})

    with pytest.raises(MockFixtureNotFound, match="固定主题"):
        asyncio.run(
            generate_knowledge_package(
                "P_TEST_KNOWLEDGE",
                brief,
                on_event=events.append,
                run_options=RunOptions(
                    mode="mock", store=store, export_dir=str(tmp_path / "exports")
                ),
            )
        )

    assert events[-1]["event_type"] == "failed"
    assert "离线 Mock" in events[-1]["error"]
    assert store.get_run("P_TEST_KNOWLEDGE", events[0]["run_id"]).status == "failed"


class FakeRoleClient:
    def __init__(self, *, supported=True):
        self.supported = supported
        self.calls = 0

    async def generate_json(self, *, role, **kwargs):
        self.calls += 1
        if role == "research":
            claim = {
                "content": "两次独立掷硬币同时为正面的概率是 1/4。",
                "explanation": "两次抛掷有四个等可能的有序结果，其中一个是正正。",
                "conditions": ["硬币公平，且两次抛掷相互独立。"],
                "related_concepts": ["独立事件"],
                "depends_on": [],
                "provenance": "derivation" if self.supported else "model_generated",
                "derivation_steps": "四种有序结果 HH、HT、TH、TT 等可能；有利结果为 HH，因此概率为 1/4。"
                if self.supported else "",
            }
            value = {"summary": "从样本空间计数得到一个可复核结论。", "claims": [claim], "search_tasks": [], "discoveries": []}
        elif role == "creative":
            value = {
                "candidates": [
                    {
                        "title": "两次抛掷为什么只有四分之一正正？",
                        "core_question": "两次公平抛掷的结果如何组合成概率？",
                        "hook": "每次都接近一半，但两次结果组成四种不同组合。",
                        "learning_goal": "理解独立试验的有序结果空间与有利结果计数。",
                        "claim_indices": [0],
                        "required_claim_indices": [0],
                        "recommendation_reason": "单个结论可由完整结果空间推导。",
                        "duration_fit": {"status": "thin", "reason": "离线测试结论较短。"},
                        "visual_potential": {"level": "medium", "reason": "结果组合可以逐项比较。"},
                        "recommended": True,
                    }
                ],
                "research_tasks": [],
                "summary": "候选围绕可复核的结果组合。",
            }
        else:
            value = {
                "reviews": [{"claim_index": 0, "decision": "pass", "issue": "", "suggested_correction": "", "concise_basis": "结果空间完整且计算正确。"}],
                "summary": "计算检查通过。",
            }
        return SimpleNamespace(value=value, usage={"input_tokens": 10, "output_tokens": 5, "total_tokens": 15})


def test_real_workflow_with_injected_clients_returns_valid_package_without_network(tmp_path):
    events = []
    store = ResearchStore(tmp_path / "knowledge.sqlite3")
    brief = build_brief({"topic": "两次掷硬币的概率"})
    llm = FakeRoleClient()
    package = asyncio.run(
        generate_knowledge_package(
            "P_REAL_TEST",
            brief,
            on_event=events.append,
            run_options=RunOptions(
                mode="real",
                allow_search=False,
                clients={"llm": llm, "search": None},
                store=store,
            ),
        )
    )

    validate_knowledge_package(package)
    assert llm.calls == 3
    assert package["knowledge_units"][0]["verification_status"] == "verified"
    assert events[-1]["stats"]["total_tokens"] == 45
    run_id = events[0]["run_id"]
    assert store.get_run("P_REAL_TEST", run_id).status == "completed"
    assert store.get_run("P_REAL_TEST", run_id).input_brief == brief
    assert store.list_leads("P_REAL_TEST")
    assert store.get_claim_and_evidence(
        package["knowledge_units"][0]["id"], project_id="P_REAL_TEST"
    )["evidence"]


def test_real_workflow_keeps_model_only_claims_unverified(tmp_path):
    events = []
    brief = build_brief({"topic": "两次掷硬币的概率"})
    with pytest.raises(ValueError, match="No candidate direction"):
        asyncio.run(
            generate_knowledge_package(
                "P_REAL_TEST",
                brief,
                on_event=events.append,
                run_options=RunOptions(
                    mode="real",
                    allow_search=False,
                    clients={"llm": FakeRoleClient(supported=False), "search": None},
                    store=ResearchStore(tmp_path / "model-only.sqlite3"),
                ),
            )
        )

    assert events[-1]["event_type"] == "failed"
    assert "未形成正式知识包" in events[-1]["summary"]


def test_missing_api_key_is_reported_as_a_research_phase_failure(monkeypatch):
    import knowledge.service as service_module
    from knowledge.config import KnowledgeSettings
    from knowledge.llm_client import APIKeyMissingError

    events = []
    monkeypatch.setattr(
        service_module,
        "load_settings",
        lambda: KnowledgeSettings(
            api_key=None,
            base_url="https://api.deepseek.com",
            model="deepseek-flash",
            timeout_seconds=5,
            data_dir=Path("/tmp/knowledge-data"),
            export_dir=Path("/tmp/knowledge-exports"),
        ),
    )
    with pytest.raises(APIKeyMissingError, match="DEEPSEEK_API_KEY"):
        asyncio.run(
            generate_knowledge_package(
                "P_TEST_KNOWLEDGE",
                build_brief({"topic": "生日悖论"}),
                on_event=events.append,
                run_options=RunOptions(mode="real"),
            )
        )

    assert events[-1]["phase"] == "research"
    assert events[-1]["event_type"] == "failed"
