"""Single public entry point for knowledge package generation."""

from __future__ import annotations

import inspect
import re
import time
import uuid
from dataclasses import dataclass
from typing import Any, Callable

from .brief import validate_brief
from .mock_data import MockFixtureNotFound, make_mock_package
from .package import validate_knowledge_package


@dataclass(slots=True)
class RunOptions:
    """Internal run controls; these fields never enter the public package."""

    mode: str = "real"
    allow_search: bool = True
    max_searches: int = 3
    max_fetches: int = 3
    force_refresh: bool = False
    data_dir: str | None = None
    export_dir: str | None = None
    clients: dict[str, Any] | None = None
    fail_at: str | None = None

    def __post_init__(self) -> None:
        if self.mode not in {"mock", "real"}:
            raise ValueError("run_options.mode must be 'mock' or 'real'")
        if self.max_searches < 0 or self.max_fetches < 0:
            raise ValueError("search and fetch limits cannot be negative")


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
        raise RuntimeError(
            "Real API workflow is not available yet; use mode='mock' until DeepSeek integration is installed."
        )

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
