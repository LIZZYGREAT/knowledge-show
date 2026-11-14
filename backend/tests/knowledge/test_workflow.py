import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest

from knowledge.brief import build_brief
from knowledge.mock_data import MockFixtureNotFound
from knowledge.package import validate_knowledge_package
from knowledge.search_client import FetchPage, SearchHit
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


class CreativeResearchLoopClient:
    def __init__(self):
        self.calls = []
        self.research_calls = 0
        self.creative_calls = 0

    async def generate_json(self, *, role, **kwargs):
        self.calls.append(role)
        if role == "research":
            self.research_calls += 1
            if self.research_calls == 1:
                value = {
                    "summary": "可从公平抛掷的样本空间建立基础。",
                    "claims": [
                        {
                            "content": "公平硬币正面和反面的概率各为二分之一。",
                            "explanation": "两个结果等可能。",
                            "conditions": ["硬币是公平的。"],
                            "related_concepts": ["等可能结果"],
                            "depends_on": [],
                            "provenance": "derivation",
                            "derivation_steps": "样本空间有正面、反面两个等可能结果，正面占其中一个。",
                        }
                    ],
                    "search_tasks": [],
                    "discoveries": [],
                }
            else:
                value = {
                    "summary": "两个独立抛掷共有四种等可能组合。",
                    "claims": [
                        {
                            "content": "两次独立抛掷都为正面的概率是四分之一。",
                            "explanation": "四种等可能组合中只有正正符合条件。",
                            "conditions": ["硬币公平，且两次抛掷相互独立。"],
                            "related_concepts": ["独立事件", "样本空间"],
                            "depends_on": [],
                            "provenance": "derivation",
                            "derivation_steps": "HH、HT、TH、TT 四种等可能组合中，只有 HH，因此概率为 1/4。",
                        }
                    ],
                    "search_tasks": [],
                    "discoveries": [],
                }
        elif role == "creative":
            self.creative_calls += 1
            claims = [0] if self.creative_calls == 1 else [0, 1]
            value = {
                "candidates": [
                    {
                        "title": "从一次正面到连续正面",
                        "core_question": "为什么连续两次正面只有四分之一？",
                        "hook": "每次都是二分之一，但组合结果会增加。",
                        "learning_goal": "理解独立事件的结果组合。",
                        "claim_indices": claims,
                        "required_claim_indices": claims,
                        "recommendation_reason": "样本空间可以清楚解释概率变化。",
                        "duration_fit": {"status": "adequate", "reason": "两步计算适合短片说明。"},
                        "visual_potential": {"level": "high", "reason": "四种结果可以逐项比较。"},
                        "recommended": True,
                    }
                ],
                "research_tasks": []
                if self.creative_calls > 1
                else [
                    {
                        "question": "两次独立抛掷都为正面的概率怎样推导？",
                        "purpose": "补足候选方向需要的组合概率。",
                        "claim_indices": [0],
                        "candidate_index": 0,
                        "gap_to_resolve": "需要展示完整结果空间。",
                    }
                ],
                "summary": "候选由独立试验的结果组合构成。",
            }
        else:
            value = {
                "reviews": [
                    {"claim_index": index, "decision": "pass"}
                    for index in range(2)
                ],
                "summary": "两条推导都能逐步复核。",
            }
        return SimpleNamespace(
            value=value,
            usage={"input_tokens": 10, "output_tokens": 5, "total_tokens": 15},
        )


class VerifierRevisionClient:
    def __init__(self, *, required_unsupported=False, problem_category="fact_problem", low_risk=False):
        self.calls = []
        self.refinement_data = None
        self.creative_feedback = []
        self.required_unsupported = required_unsupported
        self.problem_category = problem_category
        self.low_risk = low_risk
        self.verifier_calls = 0

    async def generate_json(self, *, role, **kwargs):
        self.calls.append(role)
        if role == "research":
            value = {
                "summary": "One derivable fact and one model-only claim.",
                "claims": [
                    {
                        "content": "A fair coin has two equally likely outcomes.",
                        "explanation": "The outcomes are heads and tails.",
                        "conditions": ["The coin is fair."],
                        "related_concepts": [],
                        "depends_on": [],
                        "provenance": "derivation",
                        "derivation_steps": "There are two equiprobable outcomes, heads and tails.",
                    },
                    {
                        "content": "A model-only claim without evidence.",
                        "explanation": "No source or derivation is provided.",
                        "conditions": [],
                        "related_concepts": [],
                        "depends_on": [],
                        "provenance": "model_generated",
                        "derivation_steps": "",
                    },
                ],
                "search_tasks": [],
                "discoveries": [],
            }
        elif role == "creative":
            if "verification_feedback" in kwargs["data"]:
                self.refinement_data = kwargs["data"]
                self.creative_feedback.append(kwargs["data"]["verification_feedback"])
                claim_indices = [0]
                required = [0]
            else:
                claim_indices = [0, 1]
                required = [0, 1] if self.required_unsupported else [0]
            value = {
                "candidates": [
                    {
                        "title": "公平硬币为什么各有一半机会？",
                        "core_question": "两种结果为什么等可能？",
                        "hook": "每次抛掷只有正反两种结果。",
                        "learning_goal": "理解等可能结果的概率。",
                        "claim_indices": claim_indices,
                        "required_claim_indices": required,
                        "recommendation_reason": "可以从两个结果的样本空间直接说明。",
                        "duration_fit": {"status": "adequate", "reason": "一个短推导即可说明。"},
                        "visual_potential": {"level": "medium", "reason": "两种结果可直接比较。"},
                        "recommended": True,
                    }
                ],
                "research_tasks": [],
                "summary": "候选围绕等可能结果。",
            }
        else:
            self.verifier_calls += 1
            indexes = [item["index"] for item in kwargs["data"]["claims"]]
            reviews = []
            for index in indexes:
                review = {"claim_index": index, "decision": "pass"}
                if self.required_unsupported and index == 1 and self.verifier_calls == 1:
                    if self.problem_category == "fact_problem":
                        review.update(
                            decision="revise",
                            category="fact_problem",
                            issue="This required claim has an incorrect causal explanation.",
                            suggested_correction="Remove the unsupported causal claim.",
                            risk_level="high",
                        )
                    elif self.low_risk:
                        review["risk_level"] = "low"
                reviews.append(review)
            value = {
                "reviews": reviews,
                "summary": "核对每条方向主张。",
            }
        return SimpleNamespace(
            value=value,
            usage={"input_tokens": 10, "output_tokens": 5, "total_tokens": 15},
        )


class TargetedEvidenceClient:
    claim = "The measured precession period in the documented setup is 2.0 seconds."
    excerpt = "The experiment's measured period was 2.0 seconds."

    def __init__(self, *, omit_targeted_search_task=False):
        self.calls = []
        self.verifier_calls = 0
        self.omit_targeted_search_task = omit_targeted_search_task

    async def generate_json(self, *, role, **kwargs):
        self.calls.append(role)
        data = kwargs["data"]
        if role == "research" and "research_task" in data:
            value = {
                "summary": "A targeted source is needed for the measurement.",
                "claims": [
                    {
                        "content": self.claim,
                        "explanation": "The value is specific to the documented setup.",
                        "conditions": [],
                        "related_concepts": [],
                        "depends_on": [],
                        "provenance": "external_source",
                        "derivation_steps": "",
                    }
                ],
                "search_tasks": [] if self.omit_targeted_search_task else [
                    {
                        "question": "documented bicycle wheel gyroscope measured precession period",
                        "purpose": "Verify the measured value in the described setup.",
                        "claim_indices": [0],
                    }
                ],
                "discoveries": [],
            }
        elif role == "research" and "source_pages" in data:
            value = {
                "summary": "The fetched source contains the measured value.",
                "reviews": [
                    {
                        "claim_index": 0,
                        "source_index": 0,
                        "relation": "supports",
                        "excerpt": self.excerpt,
                        "locator": "Results section",
                    }
                ],
            }
        elif role == "research":
            value = {
                "summary": "A specific measured value needs an actual source.",
                "claims": [
                    {
                        "content": self.claim,
                        "explanation": "The value is specific to the documented setup.",
                        "conditions": [],
                        "related_concepts": [],
                        "depends_on": [],
                        "provenance": "model_generated",
                        "derivation_steps": "",
                    }
                ],
                "search_tasks": [],
                "discoveries": [],
            }
        elif role == "creative":
            value = {
                "candidates": [
                    {
                        "title": "How long does this wheel take to precess?",
                        "core_question": "What period did this setup actually measure?",
                        "hook": "A real measurement can anchor the experiment.",
                        "learning_goal": "Distinguish a measured result from a generic claim.",
                        "claim_indices": [0],
                        "required_claim_indices": [0],
                        "recommendation_reason": "The value is the core of this narrow question.",
                        "duration_fit": {"status": "thin", "reason": "One measured result anchors the explanation."},
                        "visual_potential": {"level": "medium", "reason": "A repeating motion has a measurable period."},
                        "recommended": True,
                    }
                ],
                "research_tasks": [],
                "summary": "One direction depends on a concrete measured value.",
            }
        else:
            self.verifier_calls += 1
            value = {
                "reviews": [
                    {
                        "claim_index": 0,
                        "decision": "pass",
                        "category": "none",
                        "risk_level": "high",
                    }
                ],
                "summary": "The measured value is supported." if self.verifier_calls > 1 else "A source is needed.",
            }
        return SimpleNamespace(value=value, usage={"input_tokens": 10, "output_tokens": 5, "total_tokens": 15})


class TargetedEvidenceSearch:
    def __init__(self):
        self.search_calls = []
        self.fetch_calls = []

    async def search(self, query, **kwargs):
        self.search_calls.append(query)
        return [
            SearchHit(
                title="University laboratory experiment notes",
                url="https://example.edu/gyroscope-results",
                summary="A source records the experiment's measured period.",
                query=query,
            )
        ]

    async def fetch(self, url):
        self.fetch_calls.append(url)
        return FetchPage(
            title="University laboratory experiment notes",
            content=f"Results. {TargetedEvidenceClient.excerpt}",
            url=url,
        )


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


def test_high_risk_required_claim_gets_one_targeted_evidence_attempt(tmp_path):
    events = []
    llm = TargetedEvidenceClient()
    search = TargetedEvidenceSearch()
    package = asyncio.run(
        generate_knowledge_package(
            "P_TARGETED_EVIDENCE",
            build_brief({"topic": "a specific measured gyroscope result"}),
            on_event=events.append,
            run_options=RunOptions(
                mode="real",
                max_searches=1,
                max_fetches=1,
                max_model_calls=8,
                clients={"llm": llm, "search": search},
                store=ResearchStore(tmp_path / "knowledge.sqlite3"),
            ),
        )
    )

    validate_knowledge_package(package)
    assert llm.calls == ["research", "creative", "verifier", "research", "research", "research", "verifier"]
    assert len(search.search_calls) == len(search.fetch_calls) == 1
    assert len(package["knowledge_units"]) == 1
    assert package["evidence"][0]["kind"] == "external_source"
    assert sum(event["phase"] == "creative" and event["event_type"] == "started" for event in events) == 1


def test_verifier_gap_gets_targeted_search_even_if_research_omits_search_task(tmp_path):
    events = []
    llm = TargetedEvidenceClient(omit_targeted_search_task=True)
    search = TargetedEvidenceSearch()
    package = asyncio.run(
        generate_knowledge_package(
            "P_TARGETED_EVIDENCE_FALLBACK",
            build_brief({"topic": "a specific measured gyroscope result"}),
            on_event=events.append,
            run_options=RunOptions(
                mode="real",
                max_searches=1,
                max_fetches=1,
                max_model_calls=8,
                clients={"llm": llm, "search": search},
                store=ResearchStore(tmp_path / "knowledge.sqlite3"),
            ),
        )
    )

    validate_knowledge_package(package)
    assert len(search.search_calls) == len(search.fetch_calls) == 1
    assert package["knowledge_units"][0]["verification_status"] == "verified"


def test_creative_research_gap_runs_one_targeted_research_and_refinement(tmp_path):
    events = []
    store = ResearchStore(tmp_path / "knowledge.sqlite3")
    llm = CreativeResearchLoopClient()
    package = asyncio.run(
        generate_knowledge_package(
            "P_CLOSED_LOOP",
            build_brief({"topic": "两次独立抛硬币的概率"}),
            on_event=events.append,
            run_options=RunOptions(
                mode="real",
                allow_search=False,
                clients={"llm": llm, "search": None},
                store=store,
                export_dir=str(tmp_path / "exports"),
            ),
        )
    )

    assert llm.calls == ["research", "creative", "research", "creative", "verifier"]
    assert len(package["knowledge_units"]) == 2
    task = store.list_tasks("P_CLOSED_LOOP")[0]
    assert task.status.value == "completed"
    assert len(task.related_claim_ids) == 2
    assert sum(event["phase"] == "research" and event["event_type"] == "completed" for event in events) == 2


def test_verifier_feedback_causes_one_local_creative_revision(tmp_path):
    llm = VerifierRevisionClient(required_unsupported=True)
    package = asyncio.run(
        generate_knowledge_package(
            "P_VERIFIER_REVISION",
            build_brief({"topic": "公平硬币的概率"}),
            run_options=RunOptions(
                mode="real",
                allow_search=False,
                clients={"llm": llm, "search": None},
                store=ResearchStore(tmp_path / "knowledge.sqlite3"),
                export_dir=str(tmp_path / "exports"),
            ),
        )
    )

    assert llm.calls == ["research", "creative", "verifier", "creative", "verifier"]
    assert llm.refinement_data["verification_feedback"]["unverified_claims"][0]["category"] == "fact_problem"
    assert len(package["knowledge_units"]) == 1
    assert package["knowledge_units"][0]["content"] == "A fair coin has two equally likely outcomes."


def test_unverified_optional_claim_does_not_trigger_creative_rewrite(tmp_path):
    llm = VerifierRevisionClient()
    package = asyncio.run(
        generate_knowledge_package(
            "P_OPTIONAL_CLAIM",
            build_brief({"topic": "公平硬币的概率"}),
            run_options=RunOptions(
                mode="real",
                allow_search=False,
                clients={"llm": llm, "search": None},
                store=ResearchStore(tmp_path / "knowledge.sqlite3"),
            ),
        )
    )

    assert llm.calls == ["research", "creative", "verifier"]
    assert package["knowledge_units"][0]["content"] == "A fair coin has two equally likely outcomes."
    assert len(package["knowledge_units"]) == 1


def test_low_risk_claim_reports_contract_limit_without_retrying_or_faking_evidence(tmp_path):
    events = []
    llm = VerifierRevisionClient(
        required_unsupported=True, problem_category="none", low_risk=True
    )
    with pytest.raises(ValueError, match="No candidate direction"):
        asyncio.run(
            generate_knowledge_package(
                "P_INTERNAL_REVIEW_LIMIT",
                build_brief({"topic": "公平硬币的概率"}),
                on_event=events.append,
                run_options=RunOptions(
                    mode="real",
                    allow_search=False,
                    clients={"llm": llm, "search": None},
                    store=ResearchStore(tmp_path / "knowledge.sqlite3"),
                ),
            )
        )

    assert llm.calls == ["research", "creative", "verifier"]
    limitation = next(event for event in events if event.get("stats", {}).get("category") == "contract_limitation")
    assert "没有可记录内部复核" in limitation["issue"]
    assert events[-1]["event_type"] == "failed"


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
