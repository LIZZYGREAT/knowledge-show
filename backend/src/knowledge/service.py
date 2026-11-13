"""Single public entry point for knowledge package generation."""

from __future__ import annotations

import inspect
import json
import re
import time
import uuid
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .brief import validate_brief
from .creative import CreativeAgent
from .config import load_settings
from .llm_client import DeepSeekClient
from .mock_data import make_mock_package
from .models import Run, RunEvent
from .package import assemble_knowledge_package, validate_knowledge_package
from .research import ResearchAgent
from .search_client import DeepSeekSearchClient
from .store import ResearchStore
from .verifier import VerifierAgent


@dataclass(slots=True)
class RunOptions:
    """Internal run controls; these fields never enter the public package."""

    mode: str = "real"
    allow_search: bool = True
    max_searches: int = 3
    max_fetches: int = 3
    max_model_calls: int = 10
    force_refresh: bool = False
    data_dir: str | None = None
    export_dir: str | None = None
    clients: dict[str, Any] | None = None
    store: ResearchStore | Any | None = None
    fail_at: str | None = None

    def __post_init__(self) -> None:
        if self.mode not in {"mock", "real"}:
            raise ValueError("run_options.mode must be 'mock' or 'real'")
        if min(self.max_searches, self.max_fetches, self.max_model_calls) < 0:
            raise ValueError("external request limits cannot be negative")


class ModelCallBudget:
    def __init__(self, client: Any, limit: int) -> None:
        self.client = client
        self.limit = limit
        self.calls = 0

    async def generate_json(self, **kwargs: Any) -> Any:
        if self.calls >= self.limit:
            raise RuntimeError(f"Run stopped at its configured model-call limit ({self.limit}).")
        self.calls += 1
        return await self.client.generate_json(**kwargs)


async def _notify(callback: Callable[[dict[str, Any]], Any] | None, event: dict[str, Any]) -> None:
    if callback is None:
        return
    result = callback(event)
    if inspect.isawaitable(result):
        await result


def _artifact_id(project_id: str) -> str:
    suffix = re.sub(r"[^A-Za-z0-9_-]", "_", project_id)[:56]
    if not suffix or not suffix[0].isalpha():
        suffix = f"P_{suffix}"
    return f"KP_{suffix}"[:64]


async def generate_knowledge_package(
    project_id: str,
    brief: dict[str, Any],
    *,
    on_event: Callable[[dict[str, Any]], Any] | None = None,
    run_options: RunOptions | None = None,
) -> dict[str, Any]:
    """Run knowledge research and return a contract-valid KnowledgePackage."""
    options = run_options or RunOptions()
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{0,63}", project_id):
        raise ValueError("project_id must match the ProjectState identifier pattern")
    validate_brief(brief)

    settings = load_settings()
    if options.data_dir:
        settings = replace(settings, data_dir=Path(options.data_dir))
    if options.export_dir:
        settings = replace(settings, export_dir=Path(options.export_dir))
    store = options.store or ResearchStore(settings.data_dir / "knowledge.sqlite3")
    run_id = f"RUN_{uuid.uuid4().hex[:16]}"
    started = time.monotonic()
    started_at = datetime.now(timezone.utc)
    run = Run(
        id=run_id,
        project_id=project_id,
        input_summary=brief["user_input"]["topic"],
        input_brief=brief,
        mode=options.mode,
        started_at=started_at,
    )
    store.save_run(run)

    async def emit(event: dict[str, Any]) -> None:
        safe_event = dict(event)
        safe_event.setdefault("run_id", run_id)
        if safe_event.get("error"):
            safe_event["error"] = _safe_error(Exception(str(safe_event["error"])))
        persisted = RunEvent(
            id=f"EVT_{uuid.uuid4().hex[:16]}",
            run_id=run_id,
            phase=safe_event["phase"],
            event_type=safe_event["event_type"],
            summary=safe_event["summary"],
            elapsed_ms=safe_event.get("elapsed_ms"),
            stats=safe_event.get("stats", {}),
            error=safe_event.get("error"),
            issue=safe_event.get("issue"),
            recommendation=safe_event.get("recommendation"),
        )
        store.save_run_event(project_id, persisted)
        await _notify(on_event, safe_event)

    injected = options.clients or {}
    llm_client = injected.get("llm")
    search_client = injected.get("search")
    owns_llm = llm_client is None and options.mode == "real"
    owns_search = "search" not in injected and options.allow_search and options.mode == "real"
    llm: ModelCallBudget | None = None
    current_phase = "brief"
    try:
        await emit(
            {
                "run_id": run_id,
                "phase": "brief",
                "event_type": "completed",
                "summary": "已验证 ProjectState.brief，保留用户明确输入与系统有效配置。",
                "elapsed_ms": round((time.monotonic() - started) * 1000),
                "stats": {"mode": options.mode},
            }
        )

        if options.mode == "mock":
            current_phase = "research"
            await emit(
                {
                    "phase": "research",
                    "event_type": "started",
                    "summary": "正在读取离线固定研究资料。",
                    "stats": {"mode": "mock"},
                }
            )
            package = make_mock_package(project_id, brief)
            await emit(
                {
                    "phase": "research",
                    "event_type": "completed",
                    "summary": f"离线资料已载入：{len(package['knowledge_units'])} 条知识，未调用外网。",
                    "elapsed_ms": round((time.monotonic() - started) * 1000),
                    "stats": {"mode": "mock", "searches": 0, "fetches": 0},
                }
            )
            await emit(
                {
                    "phase": "creative",
                    "event_type": "completed",
                    "summary": f"已形成 {len(package['directions'])} 个离线候选方向。",
                    "stats": {"mode": "mock"},
                }
            )
            await emit(
                {
                    "phase": "verifier",
                    "event_type": "completed",
                    "summary": "固定资料的知识、公式与引用已完成离线结构核对。",
                    "stats": {"mode": "mock"},
                }
            )
            token_usage: dict[str, int] = {}
            run_stats = {"mode": "mock", "searches": 0, "fetches": 0}
        else:
            current_phase = "research"
            if llm_client is None:
                llm_client = DeepSeekClient(settings)
            if search_client is None and options.allow_search and "search" not in injected:
                search_client = DeepSeekSearchClient(settings)
            llm = ModelCallBudget(llm_client, options.max_model_calls)
            research_agent = ResearchAgent(
                llm,
                search_client,
                settings=settings,
                on_event=emit,
                run_id=run_id,
                max_searches=options.max_searches if options.allow_search else 0,
                max_fetches=options.max_fetches if options.allow_search else 0,
                store=store,
                force_refresh=options.force_refresh,
            )
            research = await research_agent.execute(project_id, brief)
            current_phase = "creative"
            creative_agent = CreativeAgent(
                llm, on_event=emit, run_id=run_id, store=store
            )
            creative = await creative_agent.propose(project_id, brief, research)
            creative_usage = dict(creative.usage)
            if creative.research_tasks:
                current_phase = "research"
                resolved = await research_agent.resolve_creative_tasks(
                    project_id, brief, research, creative.research_tasks
                )
                completed_tasks = [
                    task for task in creative.research_tasks if task.status.value == "completed"
                ]
                if resolved and completed_tasks:
                    current_phase = "creative"
                    creative = await creative_agent.propose(
                        project_id,
                        brief,
                        research,
                        existing=creative,
                        resolved_tasks=completed_tasks,
                    )
                    creative_usage = _sum_usage(creative_usage, creative.usage)
            current_phase = "verifier"
            verification = await VerifierAgent(
                llm, on_event=emit, run_id=run_id, store=store
            ).verify(project_id, research, creative)
            verification_usage = dict(verification.usage)
            if _recommended_direction_needs_revision(creative, verification):
                feedback = _verification_feedback(creative, verification)
                current_phase = "creative"
                creative = await creative_agent.propose(
                    project_id,
                    brief,
                    research,
                    existing=creative,
                    verification_feedback=feedback,
                )
                creative_usage = _sum_usage(creative_usage, creative.usage)
                current_phase = "verifier"
                verification = await VerifierAgent(
                    llm, on_event=emit, run_id=run_id, store=store
                ).verify(project_id, research, creative)
                verification_usage = _sum_usage(verification_usage, verification.usage)
            if not _has_eligible_candidate(creative, verification):
                feedback = _verification_feedback(creative, verification)
                feedback["final_verified_only"] = True
                current_phase = "creative"
                creative = await creative_agent.propose(
                    project_id,
                    brief,
                    research,
                    existing=creative,
                    verification_feedback=feedback,
                )
                creative_usage = _sum_usage(creative_usage, creative.usage)
                current_phase = "verifier"
                verification = await VerifierAgent(
                    llm, on_event=emit, run_id=run_id, store=store
                ).verify(project_id, research, creative)
                verification_usage = _sum_usage(verification_usage, verification.usage)
            for issue in [
                *[
                    {
                        "issue": item["issue"],
                        "recommendation": item["recommendation"],
                        "status": "open",
                    }
                    for item in research.open_issues
                ],
                *verification.public_issues,
            ]:
                await emit(
                    {
                        "phase": "verifier",
                        "event_type": "progress",
                        "summary": issue["issue"],
                        "issue": issue["issue"],
                        "recommendation": issue["recommendation"],
                        "stats": {"status": issue["status"]},
                    }
                )
            current_phase = "delivery"
            package = assemble_knowledge_package(project_id, brief, research, creative, verification)
            token_usage = {
                field: sum(item.get(field, 0) for item in research.usage)
                + creative_usage.get(field, 0)
                + verification_usage.get(field, 0)
                for field in ("input_tokens", "output_tokens", "total_tokens")
            }
            run_stats = {
                "mode": "real",
                "model_calls": llm.calls,
                "searches": research.search_count,
                "fetches": research.fetch_count,
                "sources": len(research.sources),
                **token_usage,
            }

        package["project_id"] = project_id
        package["artifact_id"] = _artifact_id(project_id)
        package["brief_revision"] = brief["revision"]
        package["revision"] = 1
        validate_knowledge_package(package)
        package = store.save_package(package)
        validate_knowledge_package(package)
        run.status = "completed"
        run.completed_at = datetime.now(timezone.utc)
        run.package_artifact_id = package["artifact_id"]
        run.package_revision = package["revision"]
        store.update_run(run)
        await emit(
            {
                "phase": "delivery",
                "event_type": "completed",
                "summary": "KnowledgePackage Schema 与引用关系检查通过。",
                "elapsed_ms": round((time.monotonic() - started) * 1000),
                "stats": {
                    **run_stats,
                    **token_usage,
                    "directions": len(package["directions"]),
                    "knowledge_units": len(package["knowledge_units"]),
                },
            }
        )
        export_run_artifacts(store, run, settings.export_dir)
        return package
    except Exception as exc:
        run.status = "failed"
        run.completed_at = datetime.now(timezone.utc)
        store.update_run(run)
        try:
            await emit(
                {
                    "phase": current_phase,
                    "event_type": "failed",
                    "summary": f"知识层在 {current_phase} 阶段未形成正式知识包。",
                    "elapsed_ms": round((time.monotonic() - started) * 1000),
                    "stats": {"mode": options.mode, "model_calls": llm.calls if llm else 0},
                    "error": _safe_error(exc),
                }
            )
        except Exception:
            pass
        try:
            export_run_artifacts(store, run, settings.export_dir)
        except Exception:
            pass
        raise
    finally:
        if owns_llm and llm_client is not None:
            await llm_client.close()
        if owns_search and search_client is not None:
            await search_client.close()


def _sum_usage(*usage_values: dict[str, int]) -> dict[str, int]:
    fields = {"input_tokens", "output_tokens", "total_tokens"}
    return {
        field: sum(usage.get(field, 0) for usage in usage_values)
        for field in fields
    }


def _recommended_direction_needs_revision(creative: Any, verification: Any) -> bool:
    candidate = next((item for item in creative.candidates if item.recommended), None)
    if candidate is None:
        return False
    return any(
        index >= len(verification.claims)
        or verification.claims[index].status.value != "verified"
        for index in candidate.claim_indices
    )


def _has_eligible_candidate(creative: Any, verification: Any) -> bool:
    for candidate in creative.candidates:
        required = candidate.required_claim_indices or candidate.claim_indices
        required_verified = all(
            0 <= index < len(verification.claims)
            and verification.claims[index].status.value == "verified"
            for index in required
        )
        has_verified_claim = any(
            0 <= index < len(verification.claims)
            and verification.claims[index].status.value == "verified"
            for index in candidate.claim_indices
        )
        if required_verified and has_verified_claim:
            return True
    return False


def _verification_feedback(creative: Any, verification: Any) -> dict[str, Any]:
    candidate = next((item for item in creative.candidates if item.recommended), None)
    issues_by_claim: dict[str, list[dict[str, str]]] = {}
    for issue in verification.public_issues:
        issues_by_claim.setdefault(issue["claim_id"], []).append(
            {"issue": issue["issue"], "recommendation": issue["recommendation"]}
        )
    unverified = []
    if candidate is not None:
        for index in candidate.claim_indices:
            if index >= len(verification.claims):
                unverified.append({"index": index, "status": "missing"})
                continue
            claim = verification.claims[index]
            if claim.status.value != "verified":
                unverified.append(
                    {
                        "index": index,
                        "claim_id": claim.id,
                        "content": claim.content,
                        "status": claim.status.value,
                        "issues": issues_by_claim.get(claim.id, []),
                    }
                )
    return {
        "recommended_title": candidate.title if candidate else "",
        "verified_claim_indices": [
            index for index, claim in enumerate(verification.claims)
            if claim.status.value == "verified"
        ],
        "unverified_claims": unverified,
    }


def _safe_error(error: Exception) -> str:
    message = str(error)
    message = re.sub(r"(?i)bearer\s+\S+", "Bearer [redacted]", message)
    message = re.sub(r"(?i)(api[_ -]?key\s*[:=]\s*)\S+", r"\1[redacted]", message)
    return message


def export_run_artifacts(
    store: ResearchStore, run: Run, export_dir: str | Path
) -> list[Path]:
    """Write a clean package and a run summary without prompts or private reasoning."""
    folder = Path(export_dir)
    folder.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    if run.status == "completed" and run.package_artifact_id and run.package_revision:
        package = store.get_package(
            run.project_id, run.package_artifact_id, revision=run.package_revision
        )
        if package is not None:
            package_path = folder / f"{run.package_artifact_id}-r{run.package_revision}.json"
            package_path.write_text(
                json.dumps(package, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            written.append(package_path)
    summary = {
        "run": run.model_dump(mode="json"),
        "events": [
            event.model_dump(mode="json")
            for event in store.list_run_events(run.project_id, run.id)
        ],
    }
    summary_path = folder / f"{run.id}.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    written.append(summary_path)
    return written
