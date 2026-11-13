from datetime import datetime, timezone

from knowledge.models import (
    Claim,
    ClaimEvidence,
    ClaimStatus,
    CreativeLead,
    Issue,
    Provenance,
    ResearchTask,
    Run,
    RunEvent,
    Source,
    TaskStatus,
)
from knowledge.store import ResearchStore, normalize_url


def _store(tmp_path):
    return ResearchStore(tmp_path / "knowledge.sqlite3")


def _source(project_id, *, source_id="SRC_A", url="https://example.org/article", content_hash="hash-a"):
    return Source(
        id=source_id,
        project_id=project_id,
        url=url,
        title="Example article",
        summary="A summary",
        content_hash=content_hash,
        query="test question",
    )


def _claim(project_id, *, claim_id="CLM_A", content="注意力机制通过权重调整信息影响。", depends_on=None):
    return Claim(
        id=claim_id,
        project_id=project_id,
        content=content,
        explanation="权重决定信息对结果的影响程度。",
        related_concepts=["Attention"],
        depends_on=depends_on or [],
        provenance=Provenance.EXTERNAL_SOURCE,
        status=ClaimStatus.VERIFIED,
    )


def test_store_isolates_projects_and_searches_chinese_and_english_claims(tmp_path):
    store = _store(tmp_path)
    store.save_claim(_claim("P_ALPHA"))
    store.save_claim(_claim("P_BETA", claim_id="CLM_B", content="生日概率由配对数量决定。"))

    results = store.search_claims("注意力", project_id="P_ALPHA")
    assert [item["claim"].id for item in results] == ["CLM_A"]
    assert store.search_claims("注意力", project_id="P_BETA") == []
    assert store.search_claims("Attention", project_id="P_ALPHA")[0]["claim"].id == "CLM_A"
    assert store.search_claims("注意力", {"status": "needs_review"}, project_id="P_ALPHA") == []


def test_store_deduplicates_sources_by_normalized_url_and_content(tmp_path):
    store = _store(tmp_path)
    first = store.save_source(
        _source("P_ALPHA", url="HTTPS://Example.org:443/article/?utm_source=search#top")
    )
    url_duplicate = store.save_source(
        _source("P_ALPHA", source_id="SRC_URL_DUP", url="https://example.org/article")
    )
    content_duplicate = store.save_source(
        _source("P_ALPHA", source_id="SRC_CONTENT_DUP", url="https://mirror.example.org/copy")
    )

    assert normalize_url("HTTPS://Example.org:443/article/?utm_source=search#top") == "https://example.org/article"
    assert url_duplicate.id == first.id
    assert content_duplicate.id == first.id
    assert store.get_source("P_ALPHA", first.id).url.startswith("HTTPS://")
    assert store.get_source("P_BETA", first.id) is None


def test_store_keeps_claim_evidence_and_dependency_retrieval_project_scoped(tmp_path):
    store = _store(tmp_path)
    source = store.save_source(_source("P_ALPHA"))
    prerequisite = store.save_claim(_claim("P_ALPHA", claim_id="CLM_BASE", content="基础注意力计算使用查询和键。"))
    claim = store.save_claim(
        _claim("P_ALPHA", claim_id="CLM_DERIVED", content="注意力权重归一化后可用于汇总信息。", depends_on=[prerequisite.id])
    )
    evidence = store.save_evidence(
        ClaimEvidence(
            id="EVD_A",
            project_id="P_ALPHA",
            claim_id=claim.id,
            evidence_kind="external_source",
            source_id=source.id,
            locator=source.url,
            excerpt="The fetched source excerpt.",
        )
    )

    retrieved = store.get_claim_and_evidence(claim.id, project_id="P_ALPHA")
    assert retrieved["claim"].id == claim.id
    assert retrieved["evidence"] == [evidence]
    assert [item.id for item in store.get_related_claims(claim.id, project_id="P_ALPHA")] == [prerequisite.id]
    assert store.get_claim_and_evidence(claim.id, project_id="P_BETA") is None


def test_store_deduplicates_tasks_and_filters_open_tasks(tmp_path):
    store = _store(tmp_path)
    task = ResearchTask(
        id="TASK_A",
        project_id="P_ALPHA",
        question="注意力机制的计算步骤是什么？",
        initiated_by="research",
        purpose="补齐计算机制",
    )
    store.save_task(task)
    duplicate = task.model_copy(
        update={"id": "TASK_B", "question": "  注意力机制的计算步骤是什么？  "}
    )
    saved_duplicate = store.save_task(duplicate)

    assert saved_duplicate.id == task.id
    assert [item.id for item in store.list_open_tasks("P_ALPHA")] == [task.id]
    store.update_task_status("P_ALPHA", task.id, TaskStatus.COMPLETED.value)
    assert store.list_open_tasks("P_ALPHA") == []


def test_store_persists_runs_events_reviews_and_package_revisions(tmp_path):
    store = _store(tmp_path)
    run = Run(
        id="RUN_A",
        project_id="P_ALPHA",
        input_summary="生日悖论",
        mode="mock",
        started_at=datetime.now(timezone.utc),
    )
    store.save_run(run)
    event = RunEvent(
        id="EVT_A",
        run_id=run.id,
        phase="research",
        event_type="completed",
        summary="完成离线研究。",
        stats={"claims": 3},
    )
    store.save_run_event("P_ALPHA", event)
    store.save_review("P_ALPHA", run.id, "needs_adjustment", "补充成立条件")

    assert store.list_runs("P_ALPHA")[0].human_note == "补充成立条件"
    assert store.list_run_events("P_ALPHA", run.id) == [event]
    assert store.list_runs("P_BETA") == []

    package = {
        "project_id": "P_ALPHA",
        "artifact_id": "KP_ALPHA",
        "brief_revision": 1,
        "revision": 0,
        "directions": [{"id": "DIR_A", "title": "First direction"}],
    }
    store.save_package(package)
    assert package["revision"] == 1
    stable_copy = dict(package)
    store.save_package(stable_copy)
    assert stable_copy["revision"] == 1
    changed = {**package, "directions": [{"id": "DIR_A", "title": "Revised direction"}]}
    store.save_package(changed)

    assert changed["revision"] == 2
    assert store.get_package("P_ALPHA", "KP_ALPHA", revision=1)["revision"] == 1
    assert store.get_package("P_ALPHA", "KP_ALPHA")["revision"] == 2
    assert store.get_package("P_BETA", "KP_ALPHA") is None


def test_store_persists_creative_leads_and_issues(tmp_path):
    store = _store(tmp_path)
    lead = CreativeLead(
        id="LEAD_A",
        project_id="P_ALPHA",
        core_question="为什么权重会改变结果？",
        learning_goal="理解查询与键的关系。",
        related_claim_ids=["CLM_A"],
    )
    issue = Issue(
        id="ISS_A",
        project_id="P_ALPHA",
        object_kind="claim",
        object_id="CLM_A",
        issue="缺少适用条件。",
        recommendation="补充条件后再核验。",
        assigned_to="research",
    )

    store.save_lead(lead)
    store.save_issue(issue)
    assert store.list_leads("P_ALPHA") == [lead]
    assert store.list_issues("P_ALPHA") == [issue]
    assert store.list_issues("P_BETA") == []
