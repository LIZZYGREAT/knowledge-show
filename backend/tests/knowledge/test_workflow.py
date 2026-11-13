import asyncio

import pytest

from knowledge.brief import build_brief
from knowledge.mock_data import MockFixtureNotFound
from knowledge.package import validate_knowledge_package
from knowledge.service import RunOptions, generate_knowledge_package


def test_mock_workflow_returns_valid_public_package_and_safe_events():
    events = []
    brief = build_brief({"topic": "生日悖论", "focus": "为什么 23 人就超过一半"})
    package = asyncio.run(
        generate_knowledge_package(
            "P_TEST_KNOWLEDGE",
            brief,
            on_event=events.append,
            run_options=RunOptions(mode="mock"),
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


def test_mock_unknown_topic_fails_without_a_package_and_reports_failure():
    events = []
    brief = build_brief({"topic": "随便一个未覆盖主题"})

    with pytest.raises(MockFixtureNotFound, match="固定主题"):
        asyncio.run(
            generate_knowledge_package(
                "P_TEST_KNOWLEDGE",
                brief,
                on_event=events.append,
                run_options=RunOptions(mode="mock"),
            )
        )

    assert events[-1]["event_type"] == "failed"
    assert "离线 Mock" in events[-1]["error"]


def test_real_mode_without_clients_does_not_fabricate_success():
    brief = build_brief({"topic": "生日悖论"})

    with pytest.raises(RuntimeError, match="not available yet"):
        asyncio.run(
            generate_knowledge_package(
                "P_TEST_KNOWLEDGE", brief, run_options=RunOptions(mode="real")
            )
        )
