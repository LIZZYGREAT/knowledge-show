"""Fixed, clearly-labelled offline fixtures for page and contract checks."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any


class MockFixtureNotFound(ValueError):
    pass


_FIXTURE_BY_ALIAS = {
    "生日悖论": "birthday_paradox.json",
    "生日问题": "birthday_paradox.json",
    "birthday paradox": "birthday_paradox.json",
    "attention": "attention.json",
    "注意力机制": "attention.json",
    "self-attention": "attention.json",
    "骰子": "dice.json",
    "两个骰子": "dice.json",
    "点数和": "dice.json",
}
_SUPPORTED_TOPICS = tuple(_FIXTURE_BY_ALIAS)


def mock_topic_supported(topic: str) -> bool:
    """Return whether the fixed offline library has an exact topic example."""
    return topic.strip().casefold() in {alias.casefold() for alias in _SUPPORTED_TOPICS}


def supported_mock_topics() -> tuple[str, ...]:
    return ("生日悖论", "Attention", "两个骰子")


def make_mock_package(project_id: str, brief: dict[str, Any]) -> dict[str, Any]:
    topic = brief["user_input"]["topic"].strip()
    filename = _FIXTURE_BY_ALIAS.get(topic.casefold())
    if filename is None:
        supported = "、".join(("生日悖论", "Attention", "两个骰子"))
        raise MockFixtureNotFound(
            f"离线 Mock 目前仅含固定主题：{supported}。任意主题请切换 Real API。"
        )

    fixture_path = Path(__file__).resolve().parent / "fixtures" / filename
    with fixture_path.open(encoding="utf-8") as handle:
        package = json.load(handle)
    package = deepcopy(package)
    package["project_id"] = project_id
    package["artifact_id"] = _artifact_id(project_id)
    package["revision"] = 1
    package["brief_revision"] = brief["revision"]

    target_ms = brief["effective"]["target_duration_ms"]
    for direction in package["directions"]:
        if target_ms < 60_000:
            status, reason = "thin", "当前目标时长较短，需进一步压缩知识主线。"
        elif target_ms > 300_000:
            status, reason = "dense", "当前目标时长较长，仍应围绕一个知识主线组织内容。"
        elif 150_000 <= target_ms <= 180_000:
            status = "adequate"
            reason = direction["duration_fit"]["reason"]
        else:
            status, reason = "uncertain", "离线样例未针对这一目标时长做内容深度评估。"
        direction["duration_fit"] = {"status": status, "reason": reason}

    if brief["user_input"].get("focus"):
        package["directions"][0]["recommendation_reason"] += (
            f" 用户指定的关注方向为：{brief['user_input']['focus']}。"
        )
    return package


def _artifact_id(project_id: str) -> str:
    import re

    suffix = re.sub(r"[^A-Za-z0-9_-]", "_", project_id)[:56]
    if not suffix or not suffix[0].isalpha():
        suffix = f"P_{suffix}"
    return f"KP_{suffix}"[:64]
