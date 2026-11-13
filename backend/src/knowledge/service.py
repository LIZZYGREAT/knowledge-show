"""Single public entry point for knowledge package generation."""

from __future__ import annotations

import inspect
import re
import time
import uuid
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any, Callable

from .brief import validate_brief
from .creative import CreativeAgent
from .config import load_settings
from .llm_client import DeepSeekClient
from .mock_data import MockFixtureNotFound, make_mock_package
from .package import assemble_knowledge_package, validate_knowledge_package
from .research import ResearchAgent
from .search_client import DeepSeekSearchClient
from .verifier import VerifierAgent


@dataclass(slots=True)
class RunOptions:
    """Internal run controls; these fields never enter the public package."""

    mode: str = "real"
    allow_search: bool = True
    max_searches: int = 3
    max_fetches: int = 3
    max_model_calls: int = 6
    force_refresh: bool = False
    data_dir: str | None = None
    export_dir: str | None = None
    clients: dict[str, Any] | None = None
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
            raise RuntimeError(
                f"Run stopped at its configured model-call limit ({self.limit})."
            )
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
    run_id = f"RUN_{uuid.uuid4().hex[:16]}"
    started = time.monotonic()
    await _notify(
        on_event,
        {
            "run_id": run_id,
            "phase": "brief",
            "event_type": "completed",
            "summary": "已验证 ProjectState.brief，保留用户明确输入与系统有效配置。",
            "elapsed_ms": round((time.monotonic() - started) * 1000),
            "stats": {"mode": options.mode},
        },
    )

    if options.mode == "mock":
        try:
            await _notify(
                on_event,
                {
                    "run_id": run_id,
                    "phase": "research",
                    "event_type": "started",
                    "summary": "正在读取离线固定研究资料。",
                    "stats": {"mode": "mock"},
                },
            )
            package = make_mock_package(project_id, brief)
        except MockFixtureNotFound as exc:
            await _notify(
                on_event,
                {
                    "run_id": run_id,
                    "phase": "research",
                    "event_type": "failed",
                    "summary": "离线 Mock 没有匹配的固定主题资料。",
                    "elapsed_ms": round((time.monotonic() - started) * 1000),
                    "stats": {"mode": "mock"},
                    "error": str(exc),
                },
            )
            raise
        await _notify(
            on_event,
            {
                "run_id": run_id,
                "phase": "research",
                "event_type": "completed",
                "summary": f"离线资料已载入：{len(package['knowledge_units'])} 条知识，未调用外网。",
                "elapsed_ms": round((time.monotonic() - started) * 1000),
                "stats": {"mode": "mock", "searches": 0, "fetches": 0},
            },
        )
        await _notify(
            on_event,
            {
                "run_id": run_id,
                "phase": "creative",
                "event_type": "completed",
                "summary": f"已形成 {len(package['directions'])} 个离线候选方向。",
                "stats": {"mode": "mock"},
            },
        )
        await _notify(
            on_event,
            {
                "run_id": run_id,
                "phase": "verifier",
                "event_type": "completed",
                "summary": "固定资料的知识、公式与引用已完成离线结构核对。",
                "stats": {"mode": "mock"},
            },
        )
    else:
        injected = options.clients or {}
        llm_client = injected.get("llm")
        search_client = injected.get("search")
        owns_llm = llm_client is None
        owns_search = "search" not in injected and options.allow_search
        current_phase = "research"
        llm: ModelCallBudget | None = None
        try:
            settings = load_settings()
            if options.data_dir:
                settings = replace(settings, data_dir=Path(options.data_dir))
            if options.export_dir:
                settings = replace(settings, export_dir=Path(options.export_dir))
            if llm_client is None:
                llm_client = DeepSeekClient(settings)
            if search_client is None and options.allow_search and "search" not in injected:
                search_client = DeepSeekSearchClient(settings)
            llm = ModelCallBudget(llm_client, options.max_model_calls)
            research = await ResearchAgent(
                llm,
                search_client,
                settings=settings,
                on_event=on_event,
                run_id=run_id,
                max_searches=options.max_searches if options.allow_search else 0,
                max_fetches=options.max_fetches if options.allow_search else 0,
            ).execute(project_id, brief)
            current_phase = "creative"
            creative = await CreativeAgent(
                llm, on_event=on_event, run_id=run_id
            ).propose(project_id, brief, research)
            current_phase = "verifier"
            verification = await VerifierAgent(
                llm, on_event=on_event, run_id=run_id
            ).verify(project_id, research, creative)
            reported_issues = [
                {
                    "issue": item["issue"],
                    "recommendation": item["recommendation"],
                    "status": "open",
                }
                for item in research.open_issues
            ] + verification.public_issues
            for issue in reported_issues:
                await _notify(
                    on_event,
                    {
                        "run_id": run_id,
                        "phase": "verifier",
                        "event_type": "progress",
                        "summary": issue["issue"],
                        "issue": issue["issue"],
                        "recommendation": issue["recommendation"],
                        "stats": {"status": issue["status"]},
                    },
                )
            current_phase = "delivery"
            package = assemble_knowledge_package(
                project_id, brief, research, creative, verification
            )
            package["project_id"] = project_id
            package["artifact_id"] = _artifact_id(project_id)
            package["brief_revision"] = brief["revision"]
            package["revision"] = 1
            validate_knowledge_package(package)
            token_usage = {
                field: sum(item.get(field, 0) for item in research.usage)
                + creative.usage.get(field, 0)
                + verification.usage.get(field, 0)
                for field in ("input_tokens", "output_tokens", "total_tokens")
            }
            await _notify(
                on_event,
                {
                    "run_id": run_id,
                    "phase": "delivery",
                    "event_type": "completed",
                    "summary": "Real API KnowledgePackage 已完成 Schema、证据和引用检查。",
                    "elapsed_ms": round((time.monotonic() - started) * 1000),
                    "stats": {
                        "mode": "real",
                        "model_calls": llm.calls,
                        "searches": research.search_count,
                        "fetches": research.fetch_count,
                        "sources": len(research.sources),
                        **token_usage,
                    },
                },
            )
            return package
        except Exception as exc:
            await _notify(
                on_event,
                {
                    "run_id": run_id,
                    "phase": current_phase,
                    "event_type": "failed",
                    "summary": f"知识层在 {current_phase} 阶段未形成正式知识包。",
                    "elapsed_ms": round((time.monotonic() - started) * 1000),
                    "stats": {"mode": "real", "model_calls": llm.calls if llm else 0},
                    "error": _safe_error(exc),
                },
            )
            raise
        finally:
            if owns_llm and llm_client is not None:
                await llm_client.close()
            if owns_search and search_client is not None:
                await search_client.close()

    package["project_id"] = project_id
    package["artifact_id"] = _artifact_id(project_id)
    package["brief_revision"] = brief["revision"]
    package["revision"] = 1
    validate_knowledge_package(package)
    await _notify(
        on_event,
        {
            "run_id": run_id,
            "phase": "delivery",
            "event_type": "completed",
            "summary": "KnowledgePackage Schema 与引用关系检查通过。",
            "elapsed_ms": round((time.monotonic() - started) * 1000),
            "stats": {"directions": len(package["directions"]), "knowledge_units": len(package["knowledge_units"])},
        },
    )
    return package


def _safe_error(error: Exception) -> str:
    message = str(error)
    message = re.sub(r"(?i)bearer\s+\S+", "Bearer [redacted]", message)
    message = re.sub(r"(?i)(api[_ -]?key\s*[:=]\s*)\S+", r"\1[redacted]", message)
    return message
