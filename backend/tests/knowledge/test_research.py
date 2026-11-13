import asyncio
from pathlib import Path
from types import SimpleNamespace

from knowledge.config import KnowledgeSettings
from knowledge.models import Claim, ClaimEvidence, ClaimStatus, Provenance, ResearchTask, Source
from knowledge.research import ResearchAgent, ResearchClaimDraft, ResearchPlan, ResearchResult, ResearchTaskDraft, SourceClaimReview, SourceReview, _compact_search_query, _dependency_index, stable_id
from knowledge.search_client import FetchPage, SearchHit
from knowledge.store import ResearchStore


class ResearchLLM:
    def __init__(self):
        self.calls = 0
        self.request_data = []

    async def generate_json(self, *, role, **kwargs):
        self.calls += 1
        self.request_data.append(kwargs.get("data", {}))
        if self.calls == 1:
            value = {
                "summary": "A source is needed to support this historical claim.",
                "claims": [
                    {
                        "content": "The sample experiment began in 1901.",
                        "explanation": "A dated record identifies the experiment start.",
                        "conditions": [],
                        "related_concepts": ["history"],
                        "depends_on": [],
                        "provenance": "model_generated",
                        "derivation_steps": "",
                    }
                ],
                "search_tasks": [
                    {
                        "question": "official record sample experiment start date",
                        "purpose": "Verify the date before using it in a candidate.",
                        "claim_indices": [0],
                    }
                ],
                "discoveries": [],
            }
        else:
            value = {
                "summary": "The fetched record contains a matching date.",
                "reviews": [
                    {
                        "claim_index": 0,
                        "source_index": 0,
                        "relation": "supports",
                        "excerpt": "The experiment began in 1901.",
                        "locator": "History section",
                    }
                ],
            }
        return SimpleNamespace(value=value, usage={"input_tokens": 10, "output_tokens": 8, "total_tokens": 18})


class ResearchSearch:
    def __init__(self):
        self.search_calls = []
        self.fetch_calls = []

    async def search(self, query, **kwargs):
        self.search_calls.append(query)
        return [
            SearchHit(
                title="Official record",
                url="https://example.org/experiment",
                summary="A search summary that is not evidence.",
                authority=4,
                rerank_score=2.7,
                query=query,
            )
        ]

    async def fetch(self, url):
        self.fetch_calls.append(url)
        return FetchPage(
            title="Official record",
            content="# History\n\nThe experiment began in 1901.",
            url=url,
        )


def test_research_fetches_and_persists_exact_source_text(tmp_path):
    llm = ResearchLLM()
    search = ResearchSearch()
    events = []
    settings = KnowledgeSettings(
        api_key="test",
        base_url="https://api.deepseek.com",
        model="deepseek-flash",
        timeout_seconds=5,
        data_dir=tmp_path / "data",
        export_dir=tmp_path / "exports",
    )
    brief = {
        "revision": 1,
        "user_input": {"topic": "sample experiment"},
        "effective": {
            "creative_mode": "visual_explain",
            "knowledge_depth": "balanced",
            "aspect_ratio": "9:16",
            "target_duration_ms": 165_000,
        },
    }

    result = asyncio.run(
        ResearchAgent(
            llm,
            search,
            settings=settings,
            on_event=events.append,
            run_id="RUN_RESEARCH_TEST",
            max_searches=2,
            max_fetches=1,
        ).execute("P_RESEARCH_TEST", brief)
    )

    assert llm.calls == 2
    assert search.search_calls == ["official record sample experiment start date"]
    assert len(search.fetch_calls) == 1
    assert result.claims[0].provenance.value == "external_source"
    assert result.evidence_by_claim[result.claims[0].id][0]["locator"] == search.fetch_calls[0]
    body_path = Path(result.sources[0].content_path)
    assert body_path.read_text(encoding="utf-8") == "# History\n\nThe experiment began in 1901."
    assert [event["phase"] for event in events].count("search") == 2
    assert [event["phase"] for event in events].count("fetch") == 2


def test_research_reuses_verified_internal_claims_and_cached_source(tmp_path):
    project_id = "P_RESEARCH_CACHE"
    settings = KnowledgeSettings(
        api_key="test",
        base_url="https://api.deepseek.com",
        model="deepseek-flash",
        timeout_seconds=5,
        data_dir=tmp_path / "data",
        export_dir=tmp_path / "exports",
    )
    store = ResearchStore(settings.data_dir / "knowledge.sqlite3")
    content = "The sample experiment began in 1901."
    claim_text = "The sample experiment began in 1901."
    claim = Claim(
        id=stable_id("CLM_", project_id, claim_text + "\0"),
        project_id=project_id,
        content=claim_text,
        explanation="A dated record identifies the experiment start.",
        provenance=Provenance.EXTERNAL_SOURCE,
        status=ClaimStatus.VERIFIED,
    )
    body = settings.data_dir / project_id / "sources" / "saved.md"
    body.parent.mkdir(parents=True, exist_ok=True)
    body.write_text(content, encoding="utf-8")
    source = Source(
        id="SRC_CACHED",
        project_id=project_id,
        url="https://example.org/experiment",
        title="Official record",
        content_path=str(body),
        content_hash="cached-hash",
    )
    store.save_source(source)
    store.save_claim(claim)
    store.save_evidence(
        ClaimEvidence(
            id="EVD_CACHED",
            project_id=project_id,
            claim_id=claim.id,
            evidence_kind="external_source",
            source_id=source.id,
            locator=source.url,
            excerpt=content,
        )
    )

    llm = ResearchLLM()
    search = ResearchSearch()
    result = asyncio.run(
        ResearchAgent(
            llm,
            search,
            settings=settings,
            store=store,
            max_searches=1,
            max_fetches=1,
        ).execute(
            project_id,
            {
                "revision": 1,
                "user_input": {"topic": "sample experiment"},
                "effective": {
                    "creative_mode": "visual_explain",
                    "knowledge_depth": "balanced",
                    "aspect_ratio": "9:16",
                    "target_duration_ms": 165_000,
                },
            },
        )
    )

    assert llm.request_data[0]["prior_claims"][0]["claim"]["id"] == claim.id
    assert result.claims[0].status == ClaimStatus.VERIFIED
    assert any(item["id"] == "EVD_CACHED" for item in result.evidence_by_claim[claim.id])
    assert search.search_calls
    assert search.fetch_calls == []
    assert result.fetch_count == 0


def test_creative_followup_reuses_project_claim_before_calling_model(tmp_path):
    project_id = "P_FOLLOWUP_CACHE"
    settings = KnowledgeSettings(
        api_key="test",
        base_url="https://api.deepseek.com",
        model="deepseek-flash",
        timeout_seconds=5,
        data_dir=tmp_path / "data",
        export_dir=tmp_path / "exports",
    )
    store = ResearchStore(settings.data_dir / "knowledge.sqlite3")
    source_file = settings.data_dir / "source.md"
    source_file.parent.mkdir(parents=True, exist_ok=True)
    source_file.write_text("The stored excerpt.", encoding="utf-8")
    source = store.save_source(
        Source(
            id="SRC_FOLLOWUP",
            project_id=project_id,
            url="https://example.org/followup",
            title="Saved record",
            content_path=str(source_file),
            content_hash="followup-hash",
        )
    )
    claim = store.save_claim(
        Claim(
            id="CLM_FOLLOWUP",
            project_id=project_id,
            content="The follow-up claim answers the creative gap.",
            provenance=Provenance.EXTERNAL_SOURCE,
            status=ClaimStatus.VERIFIED,
        )
    )
    store.save_evidence(
        ClaimEvidence(
            id="EVD_FOLLOWUP",
            project_id=project_id,
            claim_id=claim.id,
            evidence_kind="external_source",
            source_id=source.id,
            locator=source.url,
            excerpt="The stored excerpt.",
        )
    )
    task = store.save_task(
        ResearchTask(
            id="TASK_FOLLOWUP",
            project_id=project_id,
            question="What does the follow-up claim answer?",
            initiated_by="creative",
            purpose="Fill a specific knowledge gap.",
        )
    )

    class UnexpectedModelCall:
        async def generate_json(self, **kwargs):
            raise AssertionError("stored evidence should resolve this task without another call")

    result = ResearchResult(
        claims=[], evidence_by_claim={}, internal_evidence=[], sources=[], source_contents={}, tasks=[]
    )
    resolved = asyncio.run(
        ResearchAgent(UnexpectedModelCall(), None, settings=settings, store=store).resolve_creative_tasks(
            project_id,
            {"revision": 1, "user_input": {"topic": "test"}, "effective": {}},
            result,
            [task],
        )
    )

    assert resolved is True
    assert result.claims == [claim]
    assert result.sources == [source]
    assert task.status.value == "completed"
    assert store.list_tasks(project_id)[0].status.value == "completed"


def test_research_accepts_claim_aliases_and_resolves_named_dependencies():
    drafts = [
        ResearchClaimDraft.model_validate(
            {
                "claim": "P(no collision) is a product of conditional probabilities.",
                "derivation": "Multiply each next-person conditional probability.",
                "provenance": "derivation",
            }
        ),
        ResearchClaimDraft.model_validate(
            {
                "claim": "At least one collision is the complement of no collision.",
                "dependencies": ["Definition of P(no collision)"],
                "provenance": "derivation",
                "derivation": "Use 1 - P(no collision).",
            }
        ),
    ]

    assert drafts[0].content.startswith("P(no collision)")
    assert drafts[1].derivation_steps == "Use 1 - P(no collision)."
    assert _dependency_index(drafts[1].depends_on[0], 1, drafts) == 0


def test_research_followup_accepts_source_and_search_task_aliases():
    plan = ResearchPlan.model_validate(
        {
            "summary": "A focused answer with a source to fetch.",
            "claims": [
                {
                    "claim": "A bounded claim.",
                    "provenance": "external_source",
                    "conditions": [],
                }
            ],
            "search_tasks": [
                {"search_query": "official source for the bounded claim", "why_it_matters": "Verify the date."}
            ],
            "discoveries": [{"claim": "A useful discovery."}],
        }
    )

    assert plan.claims[0].provenance == "external_source"
    assert plan.search_tasks[0].question == "official source for the bounded claim"
    assert plan.discoveries == [{"claim": "A useful discovery."}]
    assert ResearchClaimDraft.model_validate(
        {"claim": "An untrusted label cannot establish evidence.", "provenance": "verified_fact"}
    ).provenance == "model_generated"


def test_research_normalizes_null_optional_model_fields():
    plan = ResearchPlan.model_validate(
        {
            "summary": "A minimal research answer.",
            "claims": [
                {
                    "content": "A claim with optional null fields.",
                    "explanation": None,
                    "conditions": None,
                    "related_concepts": None,
                    "depends_on": None,
                    "derivation_steps": None,
                }
            ],
            "search_tasks": [
                {"question": "A focused query", "purpose": "Check one source", "claim_indices": None}
            ],
            "discoveries": None,
        }
    )

    assert plan.claims[0].explanation == ""
    assert plan.claims[0].conditions == []
    assert plan.claims[0].derivation_steps == ""
    assert plan.search_tasks[0].claim_indices == []
    assert plan.discoveries == []


def test_research_repairs_invalid_dependency_indices_once():
    class DependencyRepairLLM:
        def __init__(self):
            self.calls = 0

        async def generate_json(self, **kwargs):
            self.calls += 1
            depends_on = [2] if self.calls == 1 else []
            return SimpleNamespace(
                value={
                    "summary": "Two independent claims about a simple topic.",
                    "claims": [
                        {"content": "A first model-generated claim."},
                        {"content": "A second model-generated claim.", "depends_on": depends_on},
                    ],
                    "search_tasks": [],
                    "discoveries": [],
                },
                usage={"input_tokens": 1, "output_tokens": 1, "total_tokens": 2},
            )

    llm = DependencyRepairLLM()
    events = []
    result = asyncio.run(
        ResearchAgent(llm, None, on_event=events.append).execute(
            "P_DEPENDENCY_REPAIR",
            {
                "revision": 1,
                "user_input": {"topic": "simple topic"},
                "effective": {},
            },
        )
    )

    assert llm.calls == 2
    assert len(result.claims) == 2
    assert result.claims[1].depends_on == []
    assert len(result.usage) == 2
    assert any(event["event_type"] == "progress" for event in events)


def test_research_compacts_only_the_search_request_and_preserves_task_question():
    question = "What concrete experimental evidence shows that high attention weights do not reliably indicate causal importance to a model prediction, including ablation or intervention studies?"
    draft = ResearchTaskDraft.model_validate(
        {"question": question, "purpose": "Verify a specific empirical claim."}
    )
    query = _compact_search_query(draft.question)

    assert draft.question == question
    assert len(query) <= 128
    assert query.startswith("What concrete experimental evidence")


def test_source_review_accepts_verdict_alias():
    review = SourceReview.model_validate(
        {
            "summary": "A source contains a matching passage.",
            "reviews": [
                {
                    "claim_index": 0,
                    "source_index": 1,
                    "verdict": "supports",
                    "excerpt": "A short exact passage.",
                    "locator": "section 2",
                }
            ],
        }
    )

    assert review.reviews[0].relation == "supports"


def test_source_review_normalizes_noncanonical_verdicts_conservatively():
    assert SourceClaimReview.model_validate(
        {"claim_index": 0, "source_index": 0, "verdict": "contradicts"}
    ).relation == "conflicts"
    assert SourceClaimReview.model_validate(
        {"claim_index": 0, "source_index": 0, "verdict": "unclear"}
    ).relation == "partially_supports"
